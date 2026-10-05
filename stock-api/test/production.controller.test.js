const test = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateBatchPayload } = require('../src/controllers/production');
const { validateEmployeeName } = require('../src/controllers/employee');

test('validateCreateBatchPayload normalizes roster ids', () => {
  assert.deepEqual(validateCreateBatchPayload({ employeeIds: [1, 2] }), { employeeIds: [1, 2] });
  assert.deepEqual(validateCreateBatchPayload({ employeeIds: [1, '2', 1] }), { employeeIds: [1, 2] },
    'ids are coerced to numbers and deduplicated');
});

test('validateCreateBatchPayload rejects invalid employee ids', () => {
  const cases = [
    [{}, /employeeIds is required/],
    [{ employeeIds: [] }, /non-empty array/],
    [{ employeeIds: 'nope' }, /non-empty array/],
    [{ employeeIds: [0] }, /employeeIds\[0\]/],
    [{ employeeIds: [-3] }, /employeeIds\[0\]/],
    [{ employeeIds: [1.5] }, /employeeIds\[0\]/],
    [{ employeeIds: ['abc'] }, /employeeIds\[0\]/],
  ];

  for (const [body, messagePattern] of cases) {
    assert.throws(
      () => validateCreateBatchPayload(body),
      (error) => {
        assert.equal(error.statusCode, 400, `expected 400 for ${JSON.stringify(body)}`);
        assert.match(error.message, messagePattern);
        return true;
      }
    );
  }
});

test('validateCreateBatchPayload supports the legacy single-name form', () => {
  assert.deepEqual(validateCreateBatchPayload({ employeeName: '  Marta  ' }), { employeeName: 'Marta' });

  for (const body of [
    { employeeName: '' },
    { employeeName: '   ' },
    { employeeName: 42 },
    { employeeName: 'x'.repeat(101) },
  ]) {
    assert.throws(
      () => validateCreateBatchPayload(body),
      (error) => error.statusCode === 400,
      `expected 400 for ${JSON.stringify(body)}`
    );
  }
});

test('validateEmployeeName trims and bounds the roster name', () => {
  assert.equal(validateEmployeeName('  Bibiana '), 'Bibiana');
  assert.equal(validateEmployeeName('Invitado 1'), 'Invitado 1');
  assert.equal(validateEmployeeName('x'.repeat(100)), 'x'.repeat(100));

  for (const name of [undefined, null, '', '   ', 7, 'x'.repeat(101)]) {
    assert.throws(
      () => validateEmployeeName(name),
      (error) => error.statusCode === 400,
      `expected 400 for ${JSON.stringify(name)}`
    );
  }
});
