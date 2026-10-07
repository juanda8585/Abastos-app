const test = require('node:test');
const assert = require('node:assert/strict');

const ProductionService = require('../src/services/production');
const { createHarness } = require('../test-support/fakePool');

// The service logs every failed transaction; keep expected failures out of the
// test output while still asserting on the statements that were issued.
const realConsoleError = console.error;
test.before(() => { console.error = () => {}; });
test.after(() => { console.error = realConsoleError; });

function rosterHandler(rows) {
  return (sql) => {
    if (sql.includes('FROM employees')) return { rows };
    if (sql.includes('INSERT INTO production_batches')) {
      return { rows: [{ id: 42 }] };
    }
    return { rows: [] };
  };
}

test('createBatch writes the header and one junction row per employee', async () => {
  const harness = createHarness(rosterHandler([{ id: 1 }, { id: 2 }]));
  const service = new ProductionService(harness.pool);

  const batchId = await service.createBatch({ employeeIds: [2, 1] });

  assert.equal(batchId, 42);
  assert.ok(harness.has('BEGIN') && harness.has('COMMIT'));
  assert.ok(!harness.has('ROLLBACK'));

  // Employee ids are deduped and requested in a stable (ascending) order
  const rosterQuery = harness.find('FROM employees')[0];
  assert.deepEqual(rosterQuery.params[0], [1, 2]);

  const junctionRows = harness.find('INSERT INTO production_batch_employees');
  assert.equal(junctionRows.length, 2);
  assert.deepEqual(junctionRows.map((row) => row.params), [[42, 1], [42, 2]]);
});

test('createBatch rejects an unknown employee id without writing a header', async () => {
  const harness = createHarness(rosterHandler([{ id: 1 }]));
  const service = new ProductionService(harness.pool);

  await assert.rejects(
    () => service.createBatch({ employeeIds: [1, 999] }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /ID\(s\) de empleado desconocido\(s\): 999/);
      return true;
    }
  );

  assert.ok(harness.has('ROLLBACK'));
  assert.ok(!harness.has('COMMIT'));
  assert.equal(harness.find('INSERT INTO production_batches').length, 0);
  assert.equal(harness.find('INSERT INTO production_batch_employees').length, 0);
});

test('createBatch resolves a legacy single employee name against the roster', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM employees WHERE name')) return { rows: [{ id: 7 }] };
    if (sql.includes('INSERT INTO production_batches')) return { rows: [{ id: 43 }] };
    return { rows: [] };
  });
  const service = new ProductionService(harness.pool);

  const batchId = await service.createBatch({ employeeName: '  Marta  ' });

  assert.equal(batchId, 43);
  const nameQuery = harness.find('FROM employees WHERE name')[0];
  assert.equal(nameQuery.params[0], 'Marta', 'name is trimmed before lookup');

  const junctionRows = harness.find('INSERT INTO production_batch_employees');
  assert.equal(junctionRows.length, 1);
  assert.deepEqual(junctionRows[0].params, [43, 7]);
  assert.ok(harness.has('COMMIT'));
});

test('createBatch returns 404 when the legacy name is not in the roster', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM employees')) return { rows: [] };
    return { rows: [] };
  });
  const service = new ProductionService(harness.pool);

  await assert.rejects(
    () => service.createBatch({ employeeName: 'Ghost' }),
    (error) => error.statusCode === 404 && /no hace parte de la nómina/.test(error.message)
  );

  assert.ok(harness.has('ROLLBACK'));
  assert.equal(harness.find('INSERT INTO production_batches').length, 0);
});

test('createBatch requires at least one employee', async () => {
  const harness = createHarness();
  const service = new ProductionService(harness.pool);

  await assert.rejects(
    () => service.createBatch({}),
    (error) => error.statusCode === 400 && /Debe incluir al menos un empleado \(employeeIds\)/.test(error.message)
  );

  assert.ok(harness.has('ROLLBACK'));
});

test('getAllBatches limits the page window and reports the total row count', async () => {
  const row = { id: 9, created_at: '2026-10-05T10:00:00.000Z', employees: [] };
  const harness = createHarness((sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: 112 }] };
    return { rows: [row] };
  });
  const service = new ProductionService(harness.pool);

  const page = await service.getAllBatches({ limit: 10, offset: 20 });

  const [listQuery] = harness.find('ORDER BY b.created_at DESC');
  assert.match(listQuery.sql, /LIMIT \$1 OFFSET \$2/);
  assert.deepEqual(listQuery.params, [10, 20], 'the page window travels as bind parameters');

  const [countQuery] = harness.find('COUNT(*)');
  assert.equal(countQuery.params, undefined);

  assert.deepEqual(page, { items: [row], total: 112, limit: 10, offset: 20 });
  assert.ok(!harness.has('BEGIN'), 'a read must not open a transaction');
});

test('getAllBatches without a limit returns every batch', async () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const harness = createHarness((sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: 3 }] };
    return { rows };
  });
  const service = new ProductionService(harness.pool);

  const page = await service.getAllBatches();

  const [listQuery] = harness.find('ORDER BY b.created_at DESC');
  assert.ok(!listQuery.sql.includes('LIMIT'), 'an omitted limit must not cap the result');
  assert.equal(listQuery.params, undefined);

  assert.equal(page.items.length, 3);
  assert.equal(page.total, 3);
  assert.equal(page.limit, null);
  assert.equal(page.offset, 0);
});
