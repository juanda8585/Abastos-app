/**
 * Service to handle stock level operations
 */
class StockService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Fetches all stock levels joined with product information
   * @returns {Promise<Array>} List of stock levels with product details
   */
  async getStockLevels() {
    const queryText = `
      SELECT 
        sl.product_id,
        sl.current_stock,
        sl.updated_at,
        p.sku,
        p.name,
        p.unit
      FROM products p
      LEFT JOIN stock_levels sl ON p.id = sl.product_id
      ORDER BY p.SKU ASC;
    `;
    try {
      const result = await this.pool.query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Error fetching stock levels:', error);
      throw new Error(`Failed to retrieve stock levels: ${error.message}`);
    }
  }

  /**
   * Updates or inserts (UPSERT) current stock level for a product
   * @param {number} productId - The product ID
   * @param {number} currentStock - New stock balance
   * @returns {Promise<Object>} Updated stock record
   */
  async updateStockLevel(productId, currentStock) {
    const queryText = `
      INSERT INTO stock_levels (product_id, current_stock, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (product_id) 
      DO UPDATE SET 
        current_stock = EXCLUDED.current_stock,
        updated_at = CURRENT_TIMESTAMP
      RETURNING product_id, current_stock, updated_at;
    `;
    try {
      const result = await this.pool.query(queryText, [productId, currentStock]);
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating stock for product ${productId}:`, error);
      throw new Error(`Failed to update stock level: ${error.message}`);
    }
  }
}

module.exports = StockService;