const pool = require('../config/database');
const SaleService = require('../services/sale');
const { HttpError } = require('../utils/httpError');
const { parsePagination: parsePaginationQuery } = require('../utils/pagination');

const saleService = new SaleService(pool);

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * Parses and validates limit/offset query parameters.
 * Sales history is always capped: an absent `limit` means the default page
 * size, never "every row".
 * @param {Object} query
 * @returns {{limit: number, offset: number}}
 */
function parsePagination(query) {
  return parsePaginationQuery(query, { defaultLimit: DEFAULT_LIMIT, maxLimit: MAX_LIMIT });
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
    throw new HttpError(400, 'customer_id debe ser un entero positivo');
  }

  if (typeof employee_name !== 'string' || employee_name.trim() === '') {
    throw new HttpError(400, 'employee_name es obligatorio');
  }
  const trimmedEmployee = employee_name.trim();
  if (trimmedEmployee.length > 100) {
    throw new HttpError(400, 'employee_name no puede superar los 100 caracteres');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'Se requiere un arreglo de productos (items) no vacío');
  }

  const normalizedItems = items.map((item, index) => {
    const productId = Number(item?.product_id);
    const quantitySold = Number(item?.quantity_sold);
    const unitPrice = Number(item?.unit_price);

    if (!Number.isInteger(productId) || productId <= 0) {
      throw new HttpError(400, `items[${index}].product_id debe ser un entero positivo`);
    }
    if (!Number.isFinite(quantitySold) || quantitySold <= 0) {
      throw new HttpError(400, `items[${index}].quantity_sold debe ser mayor a 0`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new HttpError(400, `items[${index}].unit_price debe ser mayor o igual a 0`);
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
      return res.status(400).json({ error: 'El parámetro del ID de la venta debe ser numérico' });
    }

    const sale = await saleService.getSaleById(Number(id));

    if (!sale) {
      return res.status(404).json({ error: `No se encontró la venta con ID ${id}` });
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
      return res.status(400).json({ error: 'El parámetro del ID de la venta debe ser numérico' });
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
