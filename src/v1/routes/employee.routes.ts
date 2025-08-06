/**
 * Employee Routes
 *
 * Defines all endpoints related to employee management, including CRUD operations,
 * statistics, and department listing.
 *
 * @module routes/employee
 */

import { Router } from "express";
import { authenticateToken } from "../../middlewares/auth";
import {
  createEmployee,
  deleteEmployee,
  getDepartments,
  getEmployee,
  getEmployeesList,
  getEmployeeStats,
  updateEmployee,
} from "../../v1/controllers/employee.controller";

const routes = Router();

/**
 * @route POST /employees
 * @group Employees - Create
 * @summary Create a new employee
 * @access Private (Requires authentication)
 */
routes.post("/employees", authenticateToken, createEmployee);

/**
 * @route GET /employees
 * @group Employees - Read
 * @summary Get a list of all employees
 * @access Private (Requires authentication)
 */
routes.get("/employees", authenticateToken, getEmployeesList);

/**
 * @route GET /employees/stats
 * @group Employees - Statistics
 * @summary Get employee statistics (counts, etc.)
 * @access Private (Requires authentication)
 */
routes.get("/employees/stats", authenticateToken, getEmployeeStats);

/**
 * @route GET /employees/:id
 * @group Employees - Read
 * @summary Get a single employee by ID
 * @access Private (Requires authentication)
 */
routes.get("/employees/:id", authenticateToken, getEmployee);

/**
 * @route PUT /employees/:id
 * @group Employees - Update
 * @summary Update an existing employee by ID
 * @access Private (Requires authentication)
 */
routes.put("/employees/:id", authenticateToken, updateEmployee);

/**
 * @route DELETE /employees/:id
 * @group Employees - Delete
 * @summary Delete an employee by ID
 * @access Private (Requires authentication)
 */
routes.delete("/employees/:id", authenticateToken, deleteEmployee);

/**
 * @route GET /departments
 * @group Departments
 * @summary Get a list of all departments
 * @access Private (Requires authentication)
 */
routes.get("/departments", authenticateToken, getDepartments);

export default routes;
