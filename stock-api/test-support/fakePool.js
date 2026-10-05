/**
 * Minimal pg pool double shared by the service tests.
 *
 * `handler(sql, params)` decides the rows returned for a statement; every
 * statement is recorded in `log` so tests can assert on transaction control
 * (BEGIN/COMMIT/ROLLBACK), lock ordering and the SQL that was issued.
 *
 * Lives outside test/ on purpose: node --test executes every file under a
 * directory named "test".
 */
function createHarness(handler = () => ({ rows: [] })) {
  const log = [];

  const record = async (sql, params) => {
    const entry = { sql: sql.replace(/\s+/g, ' ').trim(), params };
    log.push(entry);
    return handler(entry.sql, params);
  };

  const client = {
    query: record,
    release: () => log.push({ sql: 'RELEASE', params: null }),
  };

  return {
    log,
    pool: {
      connect: async () => client,
      query: record,
    },
    find: (fragment) => log.filter((entry) => entry.sql.includes(fragment)),
    has: (fragment) => log.some((entry) => entry.sql.includes(fragment)),
  };
}

module.exports = { createHarness };
