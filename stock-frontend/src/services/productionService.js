import axios from 'axios';

// Instantiate Axios directly pointing to your Express server
const api = axios.create({
  baseURL: 'http://localhost:3000', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productionApi = {
  // 1. GET /api/production -> Maps to your getAllBatches controller
  getAllBatches: async () => {
    const response = await api.get('/api/batches');
    return response.data;
  },

  // 2. GET /api/production/:batchId -> Maps to your getBatchById controller
  getBatchById: async (batchId) => {
    const response = await api.get(`/api/batches/${batchId}`);
    return response.data;
  },

  // 3. POST /api/production -> Maps to your createBatch controller
  createBatch: async (employeeName) => {
    const response = await api.post('/api/batches', { employeeName });
    return response.data; // Expects: { success: true, batchId: X }
  },

  // 4. POST /api/production/:batchId/items -> Maps to your submitBatchDetails controller
  submitBatchDetails: async (batchId, items) => {
    const response = await api.post(`/api/batches/${batchId}/items`, { items });
    return response.data;
  },

  // 5. PUT /api/production/item/:itemId -> Maps to your updateBatchItem controller
  updateBatchItem: async (itemId, data) => {
    const response = await api.put(`/api/batches/item/${itemId}`, data);
    return response.data;
  },

  // 6. DELETE /api/production/item/:itemId -> Maps to your deleteBatchItem controller
  deleteBatchItem: async (itemId) => {
    const response = await api.delete(`/api/batches/item/${itemId}`);
    return response.data;
  },
  // 1. GET /api/production -> Maps to your getAllProducts controller
  getAllProducts: async () => {
    const response = await api.get('/api/products');
    return response.data;
  },
  // Fetch joined stock levels
  getStockLevels: async () => {
    const response = await api.get('/api/stock');
    return response.data;
  }
};