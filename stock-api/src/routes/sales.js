const express = require('express');
const router = express.Router();
const salesController = require('../controllers/sales');

// ==========================================
// SALES ROUTES (mounted at /api)
// ==========================================

// GET /api/sales?limit=&offset= - Sales history, newest first (paginated)
router.get('/sales', salesController.getAllSales);

// POST /api/sales - Create a sale and deduct stock in one transaction
router.post('/sales', salesController.createSale);

// GET /api/sales/:id - Fetch details for a specific sale
router.get('/sales/:id', salesController.getSaleById);

// POST /api/sales/:id/status - Move a sale through its statuses
// (body: { status: 'paid' | 'cancelled' | ... }; stock is restored when the
// new status voids the sale)
router.post('/sales/:id/status', salesController.updateSaleStatus);

// POST /api/sales/:id/refund - Refund/Cancel sale and restore inventory
router.post('/sales/:id/refund', salesController.refundSale);

module.exports = router;
