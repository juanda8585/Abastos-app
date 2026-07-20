/**
 * Service to handle product operations
 */
class ProductService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Fetches all products
   * @returns {Promise<Array>} List of all products
   */
  async getAllProducts() {
    const queryText = `
      SELECT id, name
      FROM products;
    `;
    try {
      const result = await this.pool.query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Error fetching all products:', error);
      throw new Error(`Failed to retrieve products: ${error.message}`);
    }
  }
}

module.exports = ProductService;