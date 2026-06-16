const pool = require('../config/database');
const ProductionService = require('../services/production');

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
    next(error);
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

/**
 * Handles fetching all production batch headers
 */
async function getAllBatches(req, res, next) {
  try {
    const batches = await productionService.getAllBatches();
    return res.status(200).json(batches);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles fetching a single batch along with its complete array of items
 */
async function getBatchById(req, res, next) {
  try {
    const { batchId } = req.params;
    
    if (!batchId || isNaN(batchId)) {
      return res.status(400).json({ error: 'Valid numeric batchId parameter is required' });
    }

    const batch = await productionService.getBatchWithItems(Number(batchId));
    
    if (!batch) {
      return res.status(404).json({ error: `Production batch with ID ${batchId} not found` });
    }

    return res.status(200).json(batch);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles partial or total modifications of a single production batch item
 */
async function updateBatchItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantityProduced, expirationDate } = req.body;

    if (!itemId || isNaN(itemId)) {
      return res.status(400).json({ error: 'Valid numeric itemId parameter is required' });
    }

    if (quantityProduced === undefined && expirationDate === undefined) {
      return res.status(400).json({ error: 'Provide at least quantityProduced or expirationDate to update' });
    }

    const result = await productionService.updateBatchItem(Number(itemId), {
      quantityProduced: quantityProduced !== undefined ? Number(quantityProduced) : undefined,
      expirationDate
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles deleting an item from a batch and rolling back its inventory entry
 */
async function deleteBatchItem(req, res, next) {
  try {
    const { itemId } = req.params;

    if (!itemId || isNaN(itemId)) {
      return res.status(400).json({ error: 'Valid numeric itemId parameter is required' });
    }

    const result = await productionService.deleteBatchItem(Number(itemId));
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// Ensure all definitions are safely mapped out here
module.exports = {
  createBatch,
  submitBatchDetails,
  getAllBatches,
  getBatchById,
  updateBatchItem,
  deleteBatchItem
};