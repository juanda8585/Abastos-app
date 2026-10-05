const { HttpError, internalError } = require('../utils/httpError');

/** Default page size for sales history queries. */
const DEFAULT_LIMIT = 100;
/** Hard cap so a single request can never pull an unbounded result set. */
const MAX_LIMIT = 500;

/**
 * Rolls back the current transaction without masking the original error.
 * A broken connection can make ROLLBACK itself fail; that must not replace
 * the error we are about to rethrow.
 *
 * @param {import('pg').PoolClient} client
 */
async function safeRollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch (rollbackError) {
    console.error('Rollback failed:', rollbackError);
  }
}

/**
 * Service to handle sales and inventory transactions
 */
class SaleService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Creates a sale and deducts inventory inside a single transaction.
   *
   * Stock is validated against the sum of all lines of a product (not line by
   * line), so repeated product lines can never collectively exceed the
   * available stock. Rows are locked in ascending product id order to keep a
   * stable lock ordering between concurrent sales and refunds.
   *
   * @param {Object} saleData
   * @param {number} saleData.customer_id
   * @param {string} saleData.employee_name
   * @param {Array<{product_id: number, quantity_sold: number, unit_price: number}>} saleData.items
   * @returns {Promise<Object>} Created sale details
   */
  async createSale({ customer_id, employee_name, items }) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 0. Verify the customer exists (clear 404 instead of a FK-driven 500)
      const customerResult = await client.query(
        'SELECT id FROM customers WHERE id = $1',
        [customer_id]
      );
      if (customerResult.rows.length === 0) {
        throw new HttpError(404, `Customer with ID ${customer_id} not found`);
      }

      // 1. Aggregate requested quantities per product and lock the stock rows
      const requiredByProduct = new Map();
      for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity_sold);
        requiredByProduct.set(productId, (requiredByProduct.get(productId) || 0) + quantity);
      }

      const productIds = [...requiredByProduct.keys()].sort((a, b) => a - b);
      for (const productId of productIds) {
        const stockResult = await client.query(
          `SELECT current_stock FROM stock_levels WHERE product_id = $1 FOR UPDATE`,
          [productId]
        );

        const currentStock = Number(stockResult.rows[0]?.current_stock || 0);
        const requiredStock = requiredByProduct.get(productId);
        if (currentStock < requiredStock) {
          throw new HttpError(
            409,
            `Insufficient stock for product ID ${productId}. Available: ${currentStock}, requested: ${requiredStock}`
          );
        }
      }

      // 2. Insert into sales table
      const saleQuery = `
        INSERT INTO sales (customer_id, employee_name, status)
        VALUES ($1, $2, 'paid')
        RETURNING id, customer_id, employee_name, status, sale_date, created_at;
      `;
      const saleResult = await client.query(saleQuery, [customer_id, employee_name]);
      const sale = saleResult.rows[0];

      // 3. Process each line item, movement, and stock update.
      //    Lines follow the same ascending product id order used for locking.
      const orderedItems = [...items].sort(
        (a, b) => Number(a.product_id) - Number(b.product_id)
      );

      const saleItems = [];
      for (const item of orderedItems) {
        // Insert sale_item
        const itemQuery = `
          INSERT INTO sale_items (sale_id, product_id, quantity_sold, unit_price)
          VALUES ($1, $2, $3, $4)
          RETURNING id, product_id, quantity_sold, unit_price;
        `;
        const itemResult = await client.query(itemQuery, [
          sale.id,
          item.product_id,
          item.quantity_sold,
          item.unit_price,
        ]);
        saleItems.push(itemResult.rows[0]);

        // Insert inventory movement (negative quantity for sale)
        const movementQuery = `
          INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
          VALUES ($1, $2, 'sale', $3);
        `;
        await client.query(movementQuery, [
          item.product_id,
          -Math.abs(item.quantity_sold),
          sale.id,
        ]);

        // Update stock level (row is already locked by the check above)
        const stockQuery = `
          UPDATE stock_levels
          SET current_stock = current_stock - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2;
        `;
        await client.query(stockQuery, [item.quantity_sold, item.product_id]);
      }

      await client.query('COMMIT');

      return {
        ...sale,
        items: saleItems,
      };
    } catch (error) {
      await safeRollback(client);
      console.error('Error executing createSale transaction:', error);

      if (error instanceof HttpError) {
        throw error;
      }
      throw internalError('Failed to create sale', error);
    } finally {
      client.release();
    }
  }

  /**
   * Cancels/Refunds a sale and returns items back to stock.
   *
   * The sale row is locked first, so two concurrent refunds of the same sale
   * cannot both restock. Stock rows are restored in ascending product id
   * order, matching createSale's lock order.
   *
   * @param {number} saleId
   * @returns {Promise<Object>}
   */
  async refundSale(saleId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch sale to check current status
      const saleCheck = await client.query(
        `SELECT status FROM sales WHERE id = $1 FOR UPDATE`,
        [saleId]
      );
      if (saleCheck.rows.length === 0) {
        throw new HttpError(404, `Sale with ID ${saleId} not found.`);
      }
      if (saleCheck.rows[0].status === 'refunded' || saleCheck.rows[0].status === 'cancelled') {
        throw new HttpError(409, `Sale is already ${saleCheck.rows[0].status}.`);
      }

      // 2. Fetch items to restock (stable lock order)
      const itemsResult = await client.query(
        `SELECT product_id, quantity_sold FROM sale_items WHERE sale_id = $1 ORDER BY product_id ASC`,
        [saleId]
      );

      // 3. Return stock and log movement for each item
      for (const item of itemsResult.rows) {
        // movement_type has no 'refund' value, so the ledger entry uses
        // 'adjustment' and reference_id ties it back to the refunded sale.
        const movementQuery = `
          INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
          VALUES ($1, $2, 'adjustment', $3);
        `;
        await client.query(movementQuery, [
          item.product_id,
          item.quantity_sold, // Positive quantity restores stock
          saleId,
        ]);

        // Upsert so a product without a stock_levels row is recreated instead
        // of silently losing the restock.
        const stockQuery = `
          INSERT INTO stock_levels (product_id, current_stock, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (product_id) DO UPDATE
          SET current_stock = stock_levels.current_stock + EXCLUDED.current_stock,
              updated_at = CURRENT_TIMESTAMP;
        `;
        await client.query(stockQuery, [item.product_id, item.quantity_sold]);
      }

      // 4. Update status to refunded
      const updateSaleQuery = `
        UPDATE sales
        SET status = 'refunded'
        WHERE id = $1
        RETURNING id, customer_id, status, sale_date;
      `;
      const updatedSale = await client.query(updateSaleQuery, [saleId]);

      await client.query('COMMIT');
      return updatedSale.rows[0];
    } catch (error) {
      await safeRollback(client);
      console.error(`Error refunding sale ${saleId}:`, error);

      if (error instanceof HttpError) {
        throw error;
      }
      throw internalError('Failed to refund sale', error);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves sale details with items. Uses a LEFT JOIN so a sale that has no
   * line items yet still returns instead of looking like a 404.
   *
   * @param {number} saleId
   */
  async getSaleById(saleId) {
    const queryText = `
      SELECT 
        s.id,
        s.customer_id,
        c.company_name,
        c.contact_name,
        s.employee_name,
        s.status,
        s.sale_date,
        s.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', si.id,
              'product_id', si.product_id,
              'product_name', p.name,
              'quantity_sold', si.quantity_sold,
              'unit_price', si.unit_price,
              'subtotal', (si.quantity_sold * si.unit_price)
            )
          ) FILTER (WHERE si.id IS NOT NULL), '[]'
        ) AS items
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = $1
      GROUP BY s.id, c.company_name, c.contact_name;
    `;
    try {
      const result = await this.pool.query(queryText, [saleId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching sale ID ${saleId}:`, error);
      throw internalError('Failed to retrieve sale', error);
    }
  }

  /**
   * Retrieves all sales with associated customer details and line items
   * @param {Object} options Optional filter and pagination options
   * @param {number} [options.limit] Page size (1..500, defaults to 100)
   * @param {number} [options.offset] Rows to skip (defaults to 0)
   * @returns {Promise<Array>} List of sales
   */
  async getAllSales(options = {}) {
    const limit = Number.isInteger(options.limit)
      ? Math.min(Math.max(options.limit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const offset = Number.isInteger(options.offset) && options.offset > 0
      ? options.offset
      : 0;

    const queryText = `
      SELECT 
        s.id,
        s.customer_id,
        c.company_name,
        c.contact_name,
        s.employee_name,
        s.status,
        s.sale_date,
        s.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', si.id,
              'product_id', si.product_id,
              'product_name', p.name,
              'quantity_sold', si.quantity_sold,
              'unit_price', si.unit_price,
              'subtotal', (si.quantity_sold * si.unit_price)
            )
          ) FILTER (WHERE si.id IS NOT NULL), '[]'
        ) AS items,
        COALESCE(SUM(si.quantity_sold * si.unit_price), 0) AS total_amount
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      GROUP BY s.id, c.company_name, c.contact_name
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT $1 OFFSET $2;
    `;

    try {
      const result = await this.pool.query(queryText, [limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all sales:', error);
      throw internalError('Failed to retrieve sales history', error);
    }
  }
}

module.exports = SaleService;
