import axios from 'axios';

// Instantiate Axios directly pointing to your Express server
const api = axios.create({
  baseURL: 'http://localhost:3000', 
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productionApi = {
  // 1. GET /api/batches -> Paginated batch headers
  //    `{ limit, offset }` selects the window; omitting `limit` returns every
  //    row, which is what the admin dashboard's aggregates need.
  getAllBatches: async ({ limit, offset } = {}) => {
    const params = {};
    if (limit !== undefined && limit !== null) params.limit = limit;
    if (offset) params.offset = offset;

    const response = await api.get('/api/batches', { params });
    return response.data;
  },

  // 2. GET /api/batches/:batchId -> Maps to your getBatchById controller
  getBatchById: async (batchId) => {
    const response = await api.get(`/api/batches/${batchId}`);
    return response.data;
  },

  // 3. POST /api/batches -> Creates a batch header for one or more employees
  //    (employeeIds: roster ids from employeeApi.getAllEmployees)
  createBatch: async (employeeIds) => {
    const response = await api.post('/api/batches', { employeeIds });
    return response.data; // Expects: { success: true, batchId: X }
  },

  // 4. POST /api/batches/:batchId/items -> Maps to your submitBatchDetails controller
  submitBatchDetails: async (batchId, items) => {
    const response = await api.post(`/api/batches/${batchId}/items`, { items });
    return response.data;
  },

  // 5. PUT /api/items/:itemId -> Maps to your updateBatchItem controller
  updateBatchItem: async (itemId, data) => {
    const response = await api.put(`/api/items/${itemId}`, data);
    return response.data;
  },

  // 6. DELETE /api/items/:itemId -> Maps to your deleteBatchItem controller
  deleteBatchItem: async (itemId) => {
    const response = await api.delete(`/api/items/${itemId}`);
    return response.data;
  },

  // 7. GET /api/products -> Maps to your getAllProducts controller
  getAllProducts: async () => {
    const response = await api.get('/api/products');
    console.log('Products');
    return response.data;
  },

  // 8. GET /api/stock -> Fetch joined stock levels
  getStockLevels: async () => {
    const response = await api.get('/api/stock');
    console.log('Stock');
    return response.data;
  }
};

export const salesApi = {
  // 1. GET /api/sales -> Fetches all sales records
  getAllSales: async () => {
    const response = await api.get('/api/sales');
    return response.data;
  },

  // 2. POST /api/sales -> Creates sale and updates stock
  createSale: async ({ customer_id, employee_name, items }) => {
    const response = await api.post('/api/sales', {
      customer_id,
      employee_name,
      items
    });
    return response.data;
  },

  // 3. GET /api/sales/:id -> Fetches a specific sale and its item details
  getSaleById: async (saleId) => {
    const response = await api.get(`/api/sales/${saleId}`);
    return response.data;
  },

  // 4. POST /api/sales/:id/refund -> Refunds sale and restores stock
  refundSale: async (saleId) => {
    const response = await api.post(`/api/sales/${saleId}/refund`);
    return response.data;
  }
};

export const customerApi = {
  // GET /api/customers/active -> Maps to getActiveCustomers controller
  getActiveCustomers: async () => {
    const response = await api.get('/api/customers/active');
    return response.data;
  },
};

export const employeeApi = {
  // GET /api/employees -> Full roster used to staff production batches
  getAllEmployees: async () => {
    const response = await api.get('/api/employees');
    return response.data;
  },

  // POST /api/employees -> Add someone to the roster (409 if it already exists)
  createEmployee: async (name) => {
    const response = await api.post('/api/employees', { name });
    return response.data;
  }
};