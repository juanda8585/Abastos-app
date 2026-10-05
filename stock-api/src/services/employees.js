const { HttpError, internalError } = require('../utils/httpError');

/**
 * Service to handle the employee roster.
 */
class EmployeeService {
  constructor(dbPool) {
    this.pool = dbPool;
  }

  /**
   * Full roster, ordered by name (drives the batch assignment dropdowns).
   * @returns {Promise<Array<{id: number, name: string}>>}
   */
  async getAllEmployees() {
    const queryText = `
      SELECT id, name
      FROM employees
      ORDER BY name ASC;
    `;
    try {
      const result = await this.pool.query(queryText);
      return result.rows;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw internalError('Failed to retrieve employees', error);
    }
  }

  /**
   * Adds an employee to the roster.
   * @param {string} name
   * @returns {Promise<{id: number, name: string}>}
   */
  async createEmployee(name) {
    const queryText = `
      INSERT INTO employees (name)
      VALUES ($1)
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name;
    `;
    try {
      const result = await this.pool.query(queryText, [name]);
      if (result.rows.length === 0) {
        throw new HttpError(409, `Employee "${name}" is already in the roster`);
      }
      return result.rows[0];
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      console.error('Error creating employee:', error);
      throw internalError('Failed to create employee', error);
    }
  }
}

module.exports = EmployeeService;
