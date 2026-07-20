const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production');

// POST /api/production/batches
router.post('/batches', productionController.createBatch);

// POST /api/production/batches/:batchId/details
router.post('/batches/:batchId/details', productionController.submitBatchDetails);

router.post('/batches/:batchId/items', productionController.submitBatchDetails);

// GET all batches
router.get('/batches', productionController.getAllBatches);

// GET a single batch with its aggregated items
router.get('/batches/:batchId', productionController.getBatchById);

// PUT (Update) a single batch item attribute set
router.put('/items/:itemId', productionController.updateBatchItem);

// DELETE a single batch item and its inventory history
router.delete('/items/:itemId', productionController.deleteBatchItem);

// GET all batches
router.get('/products', productionController.getAllProducts);

// GET all batches
router.get('/stock', productionController.getStockLevels);

module.exports = router;