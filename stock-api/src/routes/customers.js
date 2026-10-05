const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer');

// ==========================================
// CUSTOMER ROUTES (mounted at /api)
// ==========================================

// GET /api/customers/active - Active customers for the POS/Sales dropdown
router.get('/customers/active', customerController.getActiveCustomers);

module.exports = router;
