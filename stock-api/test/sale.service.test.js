const test = require('node:test');
const assert = require('node:assert/strict');

const SaleService = require('../src/services/sale');
const { createHarness } = require('../test-support/fakePool');

// The service logs every failed transaction; keep expected failures out of the
// test output while still asserting on the statements that were issued.
const realConsoleError = console.error;
test.before(() => { console.error = () => {}; });
test.after(() => { console.error = realConsoleError; });

const baseSale = {
  customer_id: 1,
  employee_name: 'Yanira',
  items: [{ product_id: 1, quantity_sold: 5, unit_price: 6500 }],
};

test('createSale rejects duplicate product lines whose combined quantity exceeds stock', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM customers')) return { rows: [{ id: 1 }] };
    if (sql.includes('FROM stock_levels')) return { rows: [{ current_stock: '10' }] };
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  // 6 + 6 = 12 requested against 10 available: line-by-line checks would pass.
  await assert.rejects(
    () =>
      service.createSale({
        ...baseSale,
        items: [
          { product_id: 1, quantity_sold: 6, unit_price: 6500 },
          { product_id: 1, quantity_sold: 6, unit_price: 6500 },
        ],
      }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.match(error.message, /Available: 10, requested: 12/);
      return true;
    }
  );

  assert.ok(harness.has('ROLLBACK'), 'transaction must be rolled back');
  assert.ok(!harness.has('COMMIT'), 'transaction must not be committed');
  assert.equal(harness.find('INSERT INTO sales').length, 0, 'no sale row may be written');
});

test('createSale aggregates repeated product lines when stock is sufficient', async () => {
  const harness = createHarness((sql, params) => {
    if (sql.includes('FROM customers')) return { rows: [{ id: 1 }] };
    if (sql.includes('FROM stock_levels')) return { rows: [{ current_stock: '10' }] };
    if (sql.includes('INSERT INTO sales')) {
      return { rows: [{ id: 7, customer_id: 1, employee_name: 'Yanira', status: 'paid', sale_date: '2026-10-05', created_at: new Date() }] };
    }
    if (sql.includes('INSERT INTO sale_items')) {
      return { rows: [{ id: 100, product_id: params[1], quantity_sold: params[2], unit_price: params[3] }] };
    }
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  const sale = await service.createSale({
    ...baseSale,
    items: [
      { product_id: 1, quantity_sold: 4, unit_price: 6500 },
      { product_id: 1, quantity_sold: 6, unit_price: 6500 },
    ],
  });

  assert.equal(sale.id, 7);
  assert.equal(sale.items.length, 2);
  assert.equal(harness.find('INSERT INTO sale_items').length, 2);
  assert.ok(harness.has('COMMIT'));
  assert.ok(!harness.has('ROLLBACK'));
});

test('createSale returns 404 when the customer does not exist', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM customers')) return { rows: [] };
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  await assert.rejects(
    () => service.createSale(baseSale),
    (error) => error.statusCode === 404 && /Customer with ID 1 not found/.test(error.message)
  );

  assert.ok(harness.has('ROLLBACK'));
  assert.equal(harness.find('INSERT INTO sales').length, 0);
});

test('createSale locks stock rows in ascending product id order regardless of line order', async () => {
  const lockedProducts = [];
  const harness = createHarness((sql, params) => {
    if (sql.includes('FROM customers')) return { rows: [{ id: 1 }] };
    if (sql.includes('FROM stock_levels')) {
      lockedProducts.push(params[0]);
      return { rows: [{ current_stock: '100' }] };
    }
    if (sql.includes('INSERT INTO sales')) {
      return { rows: [{ id: 9, customer_id: 1, employee_name: 'Yanira', status: 'paid', sale_date: '2026-10-05', created_at: new Date() }] };
    }
    if (sql.includes('INSERT INTO sale_items')) {
      return { rows: [{ id: 1, product_id: params[1], quantity_sold: params[2], unit_price: params[3] }] };
    }
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  const sale = await service.createSale({
    ...baseSale,
    items: [
      { product_id: 5, quantity_sold: 1, unit_price: 6500 },
      { product_id: 2, quantity_sold: 1, unit_price: 6500 },
    ],
  });

  assert.deepEqual(lockedProducts, [2, 5], 'locks must be acquired in a stable order');
  assert.deepEqual(sale.items.map((item) => item.product_id), [2, 5]);
  assert.equal(harness.find("'sale'").length, 2, 'one sale movement per line');
  assert.ok(harness.has('COMMIT'));
});

test('refundSale rejects an already refunded sale with 409', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM sales')) return { rows: [{ status: 'refunded' }] };
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  await assert.rejects(
    () => service.refundSale(3),
    (error) => error.statusCode === 409 && /already refunded/.test(error.message)
  );

  assert.ok(harness.has('ROLLBACK'));
  assert.ok(!harness.has('COMMIT'));
  assert.equal(harness.find('UPDATE stock_levels').length, 0, 'stock must not be restored twice');
});

test('refundSale returns 404 when the sale does not exist', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM sales')) return { rows: [] };
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  await assert.rejects(
    () => service.refundSale(404),
    (error) => error.statusCode === 404 && /Sale with ID 404 not found/.test(error.message)
  );

  assert.ok(harness.has('ROLLBACK'));
});

test('refundSale restores stock through an upsert and marks the sale refunded', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM sales')) return { rows: [{ status: 'paid' }] };
    if (sql.includes('FROM sale_items')) {
      return {
        rows: [
          { product_id: 1, quantity_sold: '5' },
          { product_id: 2, quantity_sold: '3' },
        ],
      };
    }
    if (sql.includes('UPDATE sales')) {
      return { rows: [{ id: 8, customer_id: 1, status: 'refunded', sale_date: '2026-10-05' }] };
    }
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  const result = await service.refundSale(8);

  assert.equal(result.status, 'refunded');
  assert.ok(harness.has('ORDER BY product_id ASC'), 'restock order must be deterministic');
  assert.equal(harness.find('ON CONFLICT (product_id) DO UPDATE').length, 2, 'upsert per line item');
  assert.equal(harness.find("'adjustment'").length, 2, 'one ledger entry per line item');
  assert.ok(harness.has('COMMIT'));
  assert.ok(!harness.has('ROLLBACK'));
});

test('refundSale rolls back and preserves the original error when a statement fails', async () => {
  const harness = createHarness((sql) => {
    if (sql.includes('FROM sales')) return { rows: [{ status: 'paid' }] };
    if (sql.includes('FROM sale_items')) return { rows: [{ product_id: 1, quantity_sold: '5' }] };
    if (sql.includes('INSERT INTO inventory_movements')) {
      throw new Error('connection terminated');
    }
    return { rows: [] };
  });
  const service = new SaleService(harness.pool);

  await assert.rejects(
    () => service.refundSale(8),
    (error) => error.statusCode === 500 && error.cause && /connection terminated/.test(error.cause.message)
  );

  assert.ok(harness.has('ROLLBACK'));
  assert.ok(!harness.has('COMMIT'));
});
