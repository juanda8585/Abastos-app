/**
 * Helpers for database transactions.
 */

/**
 * Rolls back the current transaction without masking the original error.
 * A broken connection can make ROLLBACK itself fail; that must not replace
 * the error the caller is about to rethrow.
 *
 * @param {import('pg').PoolClient} client
 */
async function safeRollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch (rollbackError) {
    console.error('Rollback failed:', rollbackError);
  }
}

module.exports = { safeRollback };
