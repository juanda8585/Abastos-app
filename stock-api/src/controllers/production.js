const pool = require('../config/database');
const ProductionService = require('../services/production');

// Instantiate the service with our database pool
const productionService = new ProductionService(pool);

/**
 * Handles batch creation
 */
async function createBatch(req, res, next) {
  try {
    const { employeeName } = req.body;
    
    if (!employeeName) {
      return res.status(400).json({ error: 'employeeName is required' });
    }

    const batchId = await productionService.createBatch(employeeName);
    return res.status(201).json({ success: true, batchId });
  } catch (error) {
    next(error); // Pass to Express global error handler
  }
}

/**
 * Handles submission of batch items/details
 */
async function submitBatchDetails(req, res, next) {
  try {
    const { batchId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'An array of items is required' });
    }

    const result = await productionService.createBatchDetails(Number(batchId), items);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBatch,
  submitBatchDetails
};