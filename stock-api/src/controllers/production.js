const pool = require('../config/database');
const ProductionService = require('../services/production');
const ProductService = require('../services/product');
const StockService = require('../services/stock');
const { HttpError } = require('../utils/httpError');
const { parsePagination } = require('../utils/pagination');

const productionService = new ProductionService(pool);
const productService = new ProductService(pool);
const stockService = new StockService(pool);

const BATCH_MAX_LIMIT = 500;

/**
 * Parses the ledger's `limit` / `offset` query parameters.
 *
 * No default is applied on purpose: omitting `limit` returns every batch, so
 * consumers that need a complete set (the admin dashboard's per-employee batch
 * counts) get all rows. Paginated callers pass an explicit page size.
 *
 * @param {Object} query
 * @returns {{limit: number|null, offset: number}}
 */
function parseBatchPagination(query) {
  return parsePagination(query, { defaultLimit: null, maxLimit: BATCH_MAX_LIMIT });
}

/**
 * Validates the batch creation body. A batch must reference at least one
 * employee, either as roster ids (preferred) or, for backwards
 * compatibility, as a single roster name.
 *
 * @param {Object} body
 * @returns {{employeeIds?: number[], employeeName?: string}}
 */
function validateCreateBatchPayload(body) {
  const { employeeIds, employeeName } = body || {};

  if (employeeIds !== undefined) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      throw new HttpError(400, 'employeeIds debe ser un arreglo no vacío de IDs de empleado');
    }

    const normalizedIds = employeeIds.map((id, index) => {
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        throw new HttpError(400, `employeeIds[${index}] debe ser un entero positivo`);
      }
      return numericId;
    });

    return { employeeIds: [...new Set(normalizedIds)] };
  }

  if (typeof employeeName === 'string' && employeeName.trim() !== '') {
    if (employeeName.trim().length > 100) {
      throw new HttpError(400, 'employeeName no puede superar los 100 caracteres');
    }
    return { employeeName: employeeName.trim() };
  }

  throw new HttpError(400, 'employeeIds es obligatorio (al menos un empleado por lote)');
}

/**
 * Handles batch creation
 */
async function createBatch(req, res, next) {
  try {
    const payload = validateCreateBatchPayload(req.body);
    const batchId = await productionService.createBatch(payload);
    return res.status(201).json({ success: true, batchId });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles submission of batch items/details
 */
async function submitBatchDetails(req, res, next) {
  try {
    const { batchId } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere un arreglo de productos (items)' });
    }

    const result = await productionService.createBatchDetails(Number(batchId), items);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles fetching a page of production batch headers
 */
async function getAllBatches(req, res, next) {
  try {
    const { limit, offset } = parseBatchPagination(req.query);
    const page = await productionService.getAllBatches({ limit, offset });
    return res.status(200).json(page);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles fetching a single batch along with its complete array of items
 */
async function getBatchById(req, res, next) {
  try {
    const { batchId } = req.params;
    
    if (!batchId || isNaN(batchId)) {
      return res.status(400).json({ error: 'El parámetro del batchId debe ser numérico' });
    }

    const batch = await productionService.getBatchWithItems(Number(batchId));
    
    if (!batch) {
      return res.status(404).json({ error: `No se encontró el lote de producción con ID ${batchId}` });
    }

    return res.status(200).json(batch);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles partial or total modifications of a single production batch item
 */
async function updateBatchItem(req, res, next) {
  try {
    const { itemId } = req.params;
    const { quantityProduced, expirationDate } = req.body;

    if (!itemId || isNaN(itemId)) {
      return res.status(400).json({ error: 'El parámetro del itemId debe ser numérico' });
    }

    if (quantityProduced === undefined && expirationDate === undefined) {
      return res.status(400).json({ error: 'Envíe al menos quantityProduced o expirationDate para actualizar' });
    }

    const result = await productionService.updateBatchItem(Number(itemId), {
      quantityProduced: quantityProduced !== undefined ? Number(quantityProduced) : undefined,
      expirationDate
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles deleting an item from a batch and rolling back its inventory entry
 */
async function deleteBatchItem(req, res, next) {
  try {
    const { itemId } = req.params;

    if (!itemId || isNaN(itemId)) {
      return res.status(400).json({ error: 'El parámetro del itemId debe ser numérico' });
    }

    const result = await productionService.deleteBatchItem(Number(itemId));
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller to fetch all current stock levels
 */
async function getStockLevels(req, res, next) {
  try {
    const stock = await stockService.getStockLevels();
    return res.status(200).json(stock);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles fetching all products
 */
async function getAllProducts(req, res, next) {
  try {
    const products = await productService.getAllProducts();
    return res.status(200).json(products);
  } catch (error) {
    next(error);
  }
}

// Ensure all definitions are safely mapped out here
module.exports = {
  createBatch,
  submitBatchDetails,
  getAllBatches,
  getBatchById,
  updateBatchItem,
  deleteBatchItem,
  getAllProducts,
  getStockLevels,
  validateCreateBatchPayload,
  parseBatchPagination
};