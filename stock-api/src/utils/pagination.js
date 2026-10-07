const { HttpError } = require('./httpError');

/**
 * Parses and validates `limit` / `offset` query parameters.
 *
 * An omitted (or null) `limit` falls back to `options.defaultLimit`. Callers
 * that must read the whole set - aggregations, exports, dashboards that count
 * rows across every record - pass `defaultLimit: null`, which means "no cap":
 * they simply omit the parameter.
 *
 * @param {Object} query Express query object
 * @param {Object} [options]
 * @param {number|null} [options.defaultLimit] Applied when `limit` is absent (null = uncapped)
 * @param {number} [options.maxLimit] Upper bound accepted for `limit`
 * @returns {{limit: number|null, offset: number}}
 */
function parsePagination(query = {}, { defaultLimit = null, maxLimit = 500 } = {}) {
  const limit = query.limit === undefined || query.limit === null
    ? defaultLimit
    : Number(query.limit);
  const offset = query.offset === undefined || query.offset === null
    ? 0
    : Number(query.offset);

  if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > maxLimit)) {
    throw new HttpError(400, `limit debe ser un número entero entre 1 y ${maxLimit}`);
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new HttpError(400, 'offset debe ser un número entero mayor o igual a 0');
  }

  return { limit, offset };
}

module.exports = { parsePagination };
