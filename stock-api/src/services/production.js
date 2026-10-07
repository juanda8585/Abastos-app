const { HttpError, internalError } = require('../utils/httpError');
const { safeRollback } = require('../utils/transaction');

/**
 * Service to handle production batch operations
 */
class ProductionService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Creates a new production batch header together with the roster of
   * employees who worked on it (one batch can have several employees).
   *
   * @param {Object} batchData
   * @param {number[]} [batchData.employeeIds] Roster ids (preferred)
   * @param {string} [batchData.employeeName]  Legacy single roster name
   * @returns {Promise<number>} The created batch ID
   */
  async createBatch({ employeeIds, employeeName } = {}) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Resolve the employees for this batch against the roster
      let resolvedEmployeeIds;
      if (Array.isArray(employeeIds) && employeeIds.length > 0) {
        const requestedIds = [...new Set(employeeIds.map(Number))].sort((a, b) => a - b);
        const rosterResult = await client.query(
          'SELECT id FROM employees WHERE id = ANY($1::int[])',
          [requestedIds]
        );
        const knownIds = new Set(rosterResult.rows.map((row) => row.id));
        const unknownIds = requestedIds.filter((id) => !knownIds.has(id));
        if (unknownIds.length > 0) {
          throw new HttpError(400, `ID(s) de empleado desconocido(s): ${unknownIds.join(', ')}`);
        }
        resolvedEmployeeIds = requestedIds;
      } else if (typeof employeeName === 'string' && employeeName.trim() !== '') {
        const rosterResult = await client.query(
          'SELECT id FROM employees WHERE name = $1',
          [employeeName.trim()]
        );
        if (rosterResult.rows.length === 0) {
          throw new HttpError(404, `El empleado "${employeeName.trim()}" no hace parte de la nómina`);
        }
        resolvedEmployeeIds = [rosterResult.rows[0].id];
      } else {
        throw new HttpError(400, 'Debe incluir al menos un empleado (employeeIds)');
      }

      // 2. Header: employee attribution lives in production_batch_employees
      const batchResult = await client.query(
        `INSERT INTO production_batches (production_date)
         VALUES (CURRENT_DATE)
         RETURNING id;`
      );
      const batchId = batchResult.rows[0].id;

      // 3. One junction row per employee
      for (const employeeId of resolvedEmployeeIds) {
        await client.query(
          'INSERT INTO production_batch_employees (batch_id, employee_id) VALUES ($1, $2)',
          [batchId, employeeId]
        );
      }

      await client.query('COMMIT');
      return batchId;
    } catch (error) {
      await safeRollback(client);
      console.error('Error creating production batch:', error);

      if (error instanceof HttpError) {
        throw error;
      }
      throw internalError('Failed to create batch', error);
    } finally {
      client.release();
    }
  }

  /**
   * Adds details to a batch and logs inventory movements within a database transaction
   * @param {number} batchId 
   * @param {Array<Object>} items - Array of items to process
   */
  async createBatchDetails(batchId, items) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of items) {
        await client.query(
          `
          INSERT INTO production_batch_items
          (batch_id, product_id, quantity_produced, expiration_date)
          VALUES ($1, $2, $3, $4)
          `,
          [batchId, item.productId, item.quantityProduced, item.expirationDate]
        );

        await client.query(
          `
          INSERT INTO inventory_movements
          (product_id, quantity, type, reference_id)
          VALUES ($1, $2, 'production', $3)
          `,
          [item.productId, item.quantityProduced, batchId]
        );

        await client.query(
          `
          INSERT INTO stock_levels (product_id, current_stock)
          VALUES ($1, $2)
          ON CONFLICT (product_id)
          DO UPDATE
          SET current_stock = stock_levels.current_stock + EXCLUDED.current_stock,
              updated_at = CURRENT_TIMESTAMP;
          `,
          [item.productId, item.quantityProduced]
        );
      }

      await client.query('COMMIT');
      return { success: true, batchId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Transaction aborted for batch ${batchId}:`, error);
      throw new Error(`Batch details transaction failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Fetches a page of production batch headers, each carrying the roster that
   * worked it.
   *
   * `limit: null` (the default) returns every batch: the admin dashboard
   * derives its per-employee batch counts from these rows, so it needs the
   * whole set. The ledger UI always asks for an explicit page size.
   *
   * @param {Object} [options]
   * @param {number|null} [options.limit] Page size, or null for "all rows"
   * @param {number} [options.offset] Rows to skip
   * @returns {Promise<{items: Array<Object>, total: number, limit: number|null, offset: number}>}
   */
  async getAllBatches({ limit = null, offset = 0 } = {}) {
    // Employees are aggregated in the same pass (no N+1); this query has a
    // single child join, so there is no aggregation fan-out.
    const queryText = `
      SELECT 
        b.id,
        b.created_at,
        COALESCE(
          json_agg(json_build_object('id', e.id, 'name', e.name) ORDER BY e.name)
          FILTER (WHERE e.id IS NOT NULL), '[]'
        ) AS employees
      FROM production_batches b
      LEFT JOIN production_batch_employees pbe ON pbe.batch_id = b.id
      LEFT JOIN employees e ON e.id = pbe.employee_id
      GROUP BY b.id
      ORDER BY b.created_at DESC, b.id DESC
      ${limit === null ? '' : 'LIMIT $1 OFFSET $2'};
    `;
    try {
      const [rowsResult, countResult] = await Promise.all([
        limit === null
          ? this.pool.query(queryText)
          : this.pool.query(queryText, [limit, offset]),
        // The total drives the pager, so it is counted independently of the
        // page window rather than inferred from the returned rows.
        this.pool.query('SELECT COUNT(*)::int AS total FROM production_batches')
      ]);

      return {
        items: rowsResult.rows,
        total: countResult.rows[0].total,
        limit,
        offset
      };
    } catch (error) {
      console.error('Error fetching all batches:', error);
      throw new Error(`Failed to retrieve batches: ${error.message}`);
    }
  }

  /**
   * Fetches a single batch header along with all its nested items
   * @param {number} batchId 
   * @returns {Promise<Object|null>} The production batch layout or null if not found
   */
  async getBatchWithItems(batchId) {
    // Employees come from a correlated subquery: aggregating them alongside
    // items in one GROUP BY would multiply both arrays (items x employees).
    const queryText = `
      SELECT 
        b.id AS batch_id,
        b.created_at,
        (
          SELECT COALESCE(
            json_agg(json_build_object('id', e.id, 'name', e.name) ORDER BY e.name), '[]'
          )
          FROM production_batch_employees pbe
          JOIN employees e ON e.id = pbe.employee_id
          WHERE pbe.batch_id = b.id
        ) AS employees,
        COALESCE(
          json_agg(
            json_build_object(
              'itemId', i.id,
              'productId', i.product_id,
              'quantityProduced', i.quantity_produced,
              'expirationDate', i.expiration_date
            ) ORDER BY i.id
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) AS items
      FROM production_batches b
      LEFT JOIN production_batch_items i ON b.id = i.batch_id
      WHERE b.id = $1
      GROUP BY b.id;
    `;
    try {
      const result = await this.pool.query(queryText, [batchId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching items for batch ${batchId}:`, error);
      throw new Error(`Failed to retrieve batch details: ${error.message}`);
    }
  }

  /**
 * Updates a single item's attributes and syncs inventory correctly (immutable movements)
 */
async updateBatchItem(itemId, updates) {
  const client = await this.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get current item state
    const currentItemResult = await client.query(
      `
      SELECT batch_id, product_id, quantity_produced
      FROM production_batch_items
      WHERE id = $1
      `,
      [itemId]
    );

    if (currentItemResult.rowCount === 0) {
      throw new Error(`Batch item with ID ${itemId} not found.`);
    }

    const currentItem = currentItemResult.rows[0];

    const oldQty = currentItem.quantity_produced;
    const newQty =
      updates.quantityProduced !== undefined
        ? updates.quantityProduced
        : oldQty;

    const difference = newQty - oldQty;

    // 2. Update batch item
    const updateItemQuery = `
      UPDATE production_batch_items
      SET quantity_produced = COALESCE($1, quantity_produced),
          expiration_date = COALESCE($2, expiration_date)
      WHERE id = $3
      RETURNING batch_id, product_id, quantity_produced;
    `;

    const itemResult = await client.query(updateItemQuery, [
      updates.quantityProduced,
      updates.expirationDate,
      itemId
    ]);

    const updatedItem = itemResult.rows[0];

    // 3. Update stock levels using delta (NOT overwrite)
    if (difference !== 0) {
      await client.query(
        `
        UPDATE stock_levels
        SET current_stock = current_stock + $1
        WHERE product_id = $2
        `,
        [difference, currentItem.product_id]
      );

      // 4. Insert audit movement (IMPORTANT: do NOT update old ones)
      await client.query(
        `
        INSERT INTO inventory_movements
        (product_id, quantity, type, reference_id)
        VALUES ($1, $2, $3, $4)
        `,
        [
          currentItem.product_id,
          difference,
          'adjustment',
          currentItem.batch_id
        ]
      );
    }

    await client.query('COMMIT');

    return {
      success: true,
      itemId,
      updatedValues: updatedItem,
      stockAdjustment: difference
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Transaction aborted while updating item ${itemId}:`, error);
    throw new Error(`Update item transaction failed: ${error.message}`);
  } finally {
    client.release();
  }
}

  /**
   * Deletes a single item from a batch and purges its inventory transaction entry
   * @param {number} itemId - The ID of the target production batch item row
   */
  async deleteBatchItem(itemId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete item from production_batch_items and catch its context references
      const deleteItemQuery = `
        DELETE FROM production_batch_items
        WHERE id = $1
        RETURNING batch_id, product_id;
      `;
      const itemResult = await client.query(deleteItemQuery, [itemId]);

      if (itemResult.rowCount === 0) {
        throw new Error(`Batch item with ID ${itemId} not found.`);
      }

      const deletedItem = itemResult.rows[0];

      // 2. Purge matching inventory movement row
      const deleteMovementQuery = `
        DELETE FROM inventory_movements
        WHERE reference_id = $1 AND product_id = $2 AND type = 'production';
      `;
      await client.query(deleteMovementQuery, [deletedItem.batch_id, deletedItem.product_id]);

      await client.query('COMMIT');
      return { success: true, message: `Item ${itemId} and linked inventory cleared.` };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Transaction aborted while deleting item ${itemId}:`, error);
      throw new Error(`Delete item transaction failed: ${error.message}`);
    } finally {
      client.release();
    }
  }
}

module.exports = ProductionService;