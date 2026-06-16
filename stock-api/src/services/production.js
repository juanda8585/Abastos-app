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
   * @param {number} items[].productId
   * @param {number} items[].quantityProduced
   * @param {string} items[].expirationDate
   */
  async createBatchDetails(batchId, items) {
    // Acquire a dedicated client from the pool for the transaction
    const client = await this.pool.connect();

    try {
      // 1. Begin the transaction
      await client.query('BEGIN');

      // 2. Loop through items and execute queries sequentially on the isolated client
      for (const item of items) {
        // Insert item detail
        await client.query(
          `
          INSERT INTO production_batch_items
          (batch_id, product_id, quantity_produced, expiration_date)
          VALUES ($1, $2, $3, $4)
          `,
          [
            batchId,
            item.productId,
            item.quantityProduced,
            item.expirationDate
          ]
        );

        // Insert corresponding inventory movement
        await client.query(
          `
          INSERT INTO inventory_movements
          (product_id, quantity, type, reference_id)
          VALUES ($1, $2, 'production', $3)
          `,
          [
            item.productId,
            item.quantityProduced,
            batchId
          ]
        );
      }

      // 3. Commit the transaction if all inserts succeed
      await client.query('COMMIT');
      return { success: true, batchId };

    } catch (error) {
      // 4. Rollback if anything goes wrong to ensure data integrity
      await client.query('ROLLBACK');
      console.error(`Transaction aborted for batch ${batchId}:`, error);
      throw new Error(`Batch details transaction failed: ${error.message}`);

    } finally {
      // 5. CRITICAL: Always release the client back to the pool
      client.release();
    }
  }
}

module.exports = ProductionService;