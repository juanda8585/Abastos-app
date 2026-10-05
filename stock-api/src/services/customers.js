/**
 * Service to handle customer operations
 */
class CustomerService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Fetches all active customers
   * @returns {Promise<Array>} List of active customers
   */
  async getActiveCustomers() {
    const queryText = `
      SELECT id, company_name, contact_name, phone, email, delivery_address
      FROM customers
      WHERE is_active = TRUE
      ORDER BY company_name ASC;
    `;
    try {
      const result = await this.pool.query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Error fetching active customers:', error);
      throw new Error(`Failed to retrieve active customers: ${error.message}`);
    }
  }
}

module.exports = CustomerService;