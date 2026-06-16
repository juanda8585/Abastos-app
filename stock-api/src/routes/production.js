const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production');

// POST /api/production/batches
router.post('/batches', productionController.createBatch);

// POST /api/production/batches/:batchId/details
router.post('/batches/:batchId/details', productionController.submitBatchDetails);

module.exports = router;