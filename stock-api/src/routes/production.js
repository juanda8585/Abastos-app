const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production');
const salesController = require('../controllers/sales'); // Import sales controller
const customerController = require('../controllers/customer');

// ==========================================
// PRODUCTION ROUTES
// ==========================================

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

// GET all products
router.get('/products', productionController.getAllProducts);

// GET stock levels
router.get('/stock', productionController.getStockLevels);


// ==========================================
// SALES ROUTES
// ==========================================

// POST /api/sales - Create a new sale and deduct stock
router.post('/sales', salesController.createSale);

// GET /api/sales/:id - Fetch details for a specific sale
router.get('/sales/:id', salesController.getSaleById);

router.get('/sales', salesController.getAllSales);

// POST /api/sales/:id/refund - Refund/Cancel sale and restore inventory
router.post('/sales/:id/refund', salesController.refundSale);

// GET /api/customers/active - Fetch active customers for POS/Sales dropdown
router.get('/customers/active', customerController.getActiveCustomers);


module.exports = router;