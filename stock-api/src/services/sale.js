/**
 * Service to handle sales and inventory transactions
 */
class SaleService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Creates a sale and deducts inventory inside a single transaction
   * @param {Object} saleData 
   * @returns {Promise<Object>} Created sale details
   */
  async createSale({ customer_id, employee_name, items }) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verify sufficient stock for all requested items
      for (const item of items) {
        const stockResult = await client.query(
          `SELECT current_stock FROM stock_levels WHERE product_id = $1 FOR UPDATE`,
          [item.product_id]
        );

        const currentStock = stockResult.rows[0]?.current_stock || 0;
        if (Number(currentStock) < Number(item.quantity_sold)) {
          throw new Error(`Insufficient stock for product ID ${item.product_id}. Available: ${currentStock}`);
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

      // 3. Process each line item, movement, and stock update
      const saleItems = [];
      for (const item of items) {
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

        // Update stock level
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
      await client.query('ROLLBACK');
      console.error('Error executing createSale transaction:', error);
      throw new Error(`Failed to create sale: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Cancels/Refunds a sale and returns items back to stock
   * @param {number} saleId 
   * @returns {Promise<Object>}
   */
  async refundSale(saleId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch sale to check current status
      const saleCheck = await client.query(`SELECT status FROM sales WHERE id = $1 FOR UPDATE`, [saleId]);
      if (saleCheck.rows.length === 0) {
        throw new Error(`Sale with ID ${saleId} not found.`);
      }
      if (saleCheck.rows[0].status === 'refunded' || saleCheck.rows[0].status === 'cancelled') {
        throw new Error(`Sale is already ${saleCheck.rows[0].status}.`);
      }

      // 2. Fetch items to restock
      const itemsResult = await client.query(
        `SELECT product_id, quantity_sold FROM sale_items WHERE sale_id = $1`,
        [saleId]
      );

      // 3. Return stock and log movement for each item
      for (const item of itemsResult.rows) {
        const movementQuery = `
          INSERT INTO inventory_movements (product_id, quantity, type, reference_id)
          VALUES ($1, $2, 'adjustment', $3);
        `;
        await client.query(movementQuery, [
          item.product_id,
          item.quantity_sold, // Positive quantity restores stock
          saleId,
        ]);

        const stockQuery = `
          UPDATE stock_levels
          SET current_stock = current_stock + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2;
        `;
        await client.query(stockQuery, [item.quantity_sold, item.product_id]);
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
      await client.query('ROLLBACK');
      console.error(`Error refunding sale ${saleId}:`, error);
      throw new Error(`Failed to refund sale: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves sale details with items
   * @param {number} saleId 
   */
  async getSaleById(saleId) {
    const queryText = `
      SELECT 
        s.id,
        s.customer_id,
        s.employee_name,
        s.status,
        s.sale_date,
        s.created_at,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'item_id', si.id,
            'product_id', si.product_id,
            'quantity_sold', si.quantity_sold,
            'unit_price', si.unit_price,
            'subtotal', (si.quantity_sold * si.unit_price)
          )
        ) AS items
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      WHERE s.id = $1
      GROUP BY s.id;
    `;
    try {
      const result = await this.pool.query(queryText, [saleId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Error fetching sale ID ${saleId}:`, error);
      throw new Error(`Failed to retrieve sale: ${error.message}`);
    }
  }

  /**
   * Retrieves all sales with associated customer details and line items
   * @param {Object} options Optional filter and pagination options
   * @returns {Promise<Array>} List of sales
   */
  async getAllSales(options = {}) {
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
      ORDER BY s.created_at DESC;
    `;

    try {
      const result = await this.pool.query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all sales:', error);
      throw new Error(`Failed to retrieve sales history: ${error.message}`);
    }
  }
}

module.exports = SaleService;