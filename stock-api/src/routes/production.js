const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production');

// ==========================================
// PRODUCTION ROUTES (mounted at /api)
// ==========================================

// POST /api/batches - Create a production batch header
router.post('/batches', productionController.createBatch);

// POST /api/batches/:batchId/details - Submit batch items and movements
router.post('/batches/:batchId/details', productionController.submitBatchDetails);

// POST /api/batches/:batchId/items - Alias of the details endpoint
router.post('/batches/:batchId/items', productionController.submitBatchDetails);

// GET /api/batches - All batch headers
router.get('/batches', productionController.getAllBatches);

// GET /api/batches/:batchId - A single batch with its aggregated items
router.get('/batches/:batchId', productionController.getBatchById);

// PUT /api/items/:itemId - Update a single batch item attribute set
router.put('/items/:itemId', productionController.updateBatchItem);

// DELETE /api/items/:itemId - Delete a single batch item and its inventory history
router.delete('/items/:itemId', productionController.deleteBatchItem);

// GET /api/products - All products
router.get('/products', productionController.getAllProducts);

// GET /api/stock - Current stock levels
router.get('/stock', productionController.getStockLevels);

module.exports = router;
