/**
 * Error carrying an HTTP status code.
 *
 * Services throw HttpError so the global error handler in app.js can reply
 * with the correct status (4xx) instead of turning every business failure
 * (insufficient stock, unknown customer, ...) into a generic 500.
 */
class HttpError extends Error {
  /**
   * @param {number} statusCode HTTP status code (e.g. 400, 404, 409)
   * @param {string} message Client-safe error message
   * @param {{cause?: Error}} [options]
   */
  constructor(statusCode, message, options = {}) {
    super(message, options);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

/**
 * Wraps an unexpected error as a 500 HttpError while keeping the original
 * error attached as `cause` for logging.
 *
 * @param {string} message Generic, client-safe message
 * @param {Error} cause Original error
 * @returns {HttpError}
 */
function internalError(message, cause) {
  return new HttpError(500, message, { cause });
}

module.exports = { HttpError, internalError };
