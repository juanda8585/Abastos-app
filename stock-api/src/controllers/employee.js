const pool = require('../config/database');
const EmployeeService = require('../services/employees');
const { HttpError } = require('../utils/httpError');

const employeeService = new EmployeeService(pool);

/**
 * Validates and normalizes an employee name.
 * @param {*} name
 * @returns {string}
 */
function validateEmployeeName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new HttpError(400, 'El nombre es obligatorio');
  }
  const trimmedName = name.trim();
  if (trimmedName.length > 100) {
    throw new HttpError(400, 'El nombre no puede superar los 100 caracteres');
  }
  return trimmedName;
}

/**
 * Handles fetching the full employee roster
 */
async function getAllEmployees(req, res, next) {
  try {
    const employees = await employeeService.getAllEmployees();
    return res.status(200).json(employees);
  } catch (error) {
    next(error);
  }
}

/**
 * Handles adding an employee to the roster
 */
async function createEmployee(req, res, next) {
  try {
    const name = validateEmployeeName(req.body?.name);
    const employee = await employeeService.createEmployee(name);
    return res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllEmployees,
  createEmployee,
  validateEmployeeName
};
