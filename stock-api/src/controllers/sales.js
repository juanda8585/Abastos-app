const pool = require('../config/database');
const SaleService = require('../services/sale');
const { HttpError } = require('../utils/httpError');

const saleService = new SaleService(pool);

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * Parses and validates limit/offset query parameters.
 * @param {Object} query
 * @returns {{limit: number, offset: number}}
 */
function parsePagination(query) {
  const limit = query.limit === undefined ? DEFAULT_LIMIT : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new HttpError(400, `limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new HttpError(400, 'offset must be a non-negative integer');
  }

  return { limit, offset };
}

/**
 * Validates and normalizes the create-sale request body.
 * Throws a 400 HttpError with a field specific message on invalid input.
 *
 * @param {Object} body
 * @returns {{customer_id: number, employee_name: string, items: Array<Object>}}
 */
function validateSalePayload(body) {
  const { customer_id, employee_name, items } = body || {};

  const customerId = Number(customer_id);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new HttpError(400, 'customer_id must be a positive integer');
  }

  if (typeof employee_name !== 'string' || employee_name.trim() === '') {
    throw new HttpError(400, 'employee_name is required');
  }
  const trimmedEmployee = employee_name.trim();
  if (trimmedEmployee.length > 100) {
    throw new HttpError(400, 'employee_name must be 100 characters or fewer');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'A non-empty items array is required');
  }

  const normalizedItems = items.map((item, index) => {
    const productId = Number(item?.product_id);
    const quantitySold = Number(item?.quantity_sold);
    const unitPrice = Number(item?.unit_price);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new HttpError(400, `items[${index}].product_id must be a positive integer`);
    }
    if (!Number.isFinite(quantitySold) || quantitySold <= 0) {
      throw new HttpError(400, `items[${index}].quantity_sold must be greater than 0`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError(400, `items[${index}].unit_price must be 0 or greater`);
    }

    return {
      product_id: productId,
      quantity_sold: quantitySold,
      unit_price: unitPrice
    };
  });

  return {
    customer_id: customerId,
    employee_name: trimmedEmployee,
    items: normalizedItems
  };
}

/**
 * Handles fetching all sales (paginated)
 */
async function getAllSales(req, res, next) {
  try {
    const options = parsePagination(req.query);
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
    const payload = validateSalePayload(req.body);
    const sale = await saleService.createSale(payload);
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
  refundSale,
  validateSalePayload,
  parsePagination
};
