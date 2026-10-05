const test = require('node:test');
const assert = require('node:assert/strict');

const { validateSalePayload, parsePagination } = require('../src/controllers/sales');

const validBody = {
  customer_id: 1,
  employee_name: '  Yanira  ',
  items: [{ product_id: 2, quantity_sold: 5, unit_price: 6500 }],
};

test('validateSalePayload normalizes a valid payload', () => {
  const payload = validateSalePayload(validBody);

  assert.equal(payload.customer_id, 1);
  assert.equal(payload.employee_name, 'Yanira', 'employee name is trimmed');
  assert.deepEqual(payload.items, [{ product_id: 2, quantity_sold: 5, unit_price: 6500 }]);
});

test('validateSalePayload rejects a malformed body with a 400', () => {
  const cases = [
    [undefined, /customer_id/],
    [{ ...validBody, customer_id: 'abc' }, /customer_id/],
    [{ ...validBody, customer_id: 0 }, /customer_id/],
    [{ ...validBody, employee_name: '   ' }, /employee_name/],
    [{ ...validBody, employee_name: 'x'.repeat(101) }, /employee_name/],
    [{ ...validBody, items: [] }, /items/],
    [{ ...validBody, items: 'nope' }, /items/],
    [{ ...validBody, items: [{ product_id: 1, quantity_sold: -2, unit_price: 1 }] }, /items\[0\]\.quantity_sold/],
    [{ ...validBody, items: [{ product_id: 1, quantity_sold: 1, unit_price: -1 }] }, /items\[0\]\.unit_price/],
    [{ ...validBody, items: [{ product_id: 'x', quantity_sold: 1, unit_price: 1 }] }, /items\[0\]\.product_id/],
  ];

  for (const [body, messagePattern] of cases) {
    assert.throws(
      () => validateSalePayload(body),
      (error) => {
        assert.equal(error.statusCode, 400, `expected 400 for ${JSON.stringify(body)}`);
        assert.match(error.message, messagePattern);
        return true;
      }
    );
  }
});

test('validateSalePayload flags the offending item index', () => {
  assert.throws(
    () =>
      validateSalePayload({
        ...validBody,
        items: [
          { product_id: 1, quantity_sold: 1, unit_price: 100 },
          { product_id: 2, quantity_sold: 0, unit_price: 100 },
        ],
      }),
    /items\[1\]\.quantity_sold/
  );
});

test('parsePagination applies defaults and bounds', () => {
  assert.deepEqual(parsePagination({}), { limit: 100, offset: 0 });
  assert.deepEqual(parsePagination({ limit: '25', offset: '50' }), { limit: 25, offset: 50 });

  for (const query of [
    { limit: '0' },
    { limit: '501' },
    { limit: 'all' },
    { limit: 1.5 },
    { offset: '-1' },
    { offset: 'ten' },
  ]) {
    assert.throws(
      () => parsePagination(query),
      (error) => error.statusCode === 400,
      `expected 400 for ${JSON.stringify(query)}`
    );
  }
});
