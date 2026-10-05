const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee');

// ==========================================
// EMPLOYEE ROUTES (mounted at /api)
// ==========================================

// GET /api/employees - Full roster used to assign staff to a batch
router.get('/employees', employeeController.getAllEmployees);

// POST /api/employees - Add someone to the roster (409 if already present)
router.post('/employees', employeeController.createEmployee);

module.exports = router;
