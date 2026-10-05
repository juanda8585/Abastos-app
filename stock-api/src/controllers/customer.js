const pool = require('../config/database');
const CustomerService = require('../services/customers');

const customerService = new CustomerService(pool);

/**
 * Handles fetching all active customers
 */
async function getActiveCustomers(req, res, next) {
  try {
    const customers = await customerService.getActiveCustomers();
    return res.status(200).json(customers);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActiveCustomers,
};