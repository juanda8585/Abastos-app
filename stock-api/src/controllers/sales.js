const pool = require('../config/database');
const SaleService = require('../services/sale');

const saleService = new SaleService(pool);

/**
 * Handles fetching all sales
 */
async function getAllSales(req, res, next) {
  try {
    // Optional: Pass query params (limit, offset, customer_id, etc.) if supported by service
    const options = {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined
    };

    const sales = await saleService.getAllSales(options);

    return res.status(200).json(sales);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles creating a new sale and updating inventory
 */
async function createSale(req, res, next) {
  try {
    const { customer_id, employee_name, items } = req.body;

    if (!customer_id || !employee_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'customer_id, employee_name, and a non-empty items array are required' 
      });
    }

    const sale = await saleService.createSale({
      customer_id: Number(customer_id),
      employee_name,
      items
    });

    return res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles fetching a single sale along with its line items
 */
async function getSaleById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid numeric sale ID parameter is required' });
    }

    const sale = await saleService.getSaleById(Number(id));

    if (!sale) {
      return res.status(404).json({ error: `Sale with ID ${id} not found` });
    }

    return res.status(200).json(sale);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles refunding/cancelling a sale and restoring stock levels
 */
async function refundSale(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid numeric sale ID parameter is required' });
    }

    const result = await saleService.refundSale(Number(id));
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllSales,
  createSale,
  getSaleById,
  refundSale
};