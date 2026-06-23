/**
 * Service to handle production batch operations
 */
class ProductionService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Creates a new production batch header
   * @param {string} employeeName 
   * @returns {Promise<number>} The created batch ID
   */
  async createBatch(employeeName) {
    const queryText = `
      INSERT INTO production_batches (employee_name)
      VALUES ($1)
      RETURNING id;
    `;
    
    try {
      const result = await this.pool.query(queryText, [employeeName]);
      return result.rows[0].id;
    } catch (error) {
      console.error('Error creating production batch:', error);
      throw new Error(`Failed to create batch: ${error.message}`);
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
          UPDATE stock_levels
          SET current_stock = $1
          WHERE product_id = $2
          `,
          [currentStock, productId]
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
   * Fetches all production batch headers
   * @returns {Promise<Array>} List of all batches
   */
  async getAllBatches() {
    const queryText = `
      SELECT id, employee_name, created_at 
      FROM production_batches
      ORDER BY created_at DESC;
    `;
    try {
      const result = await this.pool.query(queryText);
      return result.rows;
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
    const queryText = `
      SELECT 
        b.id AS batch_id,
        b.employee_name,
        b.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'itemId', i.id,
              'productId', i.product_id,
              'quantityProduced', i.quantity_produced,
              'expirationDate', i.expiration_date
            )
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