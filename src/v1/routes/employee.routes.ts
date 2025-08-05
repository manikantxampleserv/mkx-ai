/**
 * Employee routes
 *
 * Routes related to employee management
 *
 * @module routes/employee
 */
import { Router } from "express";
import {
  createEmployee,
  deleteEmployee,
  getDepartments,
  getEmployee,
  getEmployeesList,
  getEmployeeStats,
  updateEmployee,
} from "../controllers/employee.controller";
import { authenticateToken } from "../../middlewares/auth";

const routes = Router();

/**
 * Create new employee
 *
 * @name POST /employees
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.post("/employees", authenticateToken, (req, res) =>
  createEmployee(req, res)
);

/**
 * Get list of employees
 *
 * @name GET /employees
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.get("/employees", authenticateToken, (req, res) =>
  getEmployeesList(req, res)
);

/**
 * Get employee statistics
 *
 * @name GET /employees/stats
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.get("/employees/stats", authenticateToken, (req, res) =>
  getEmployeeStats(req, res)
);

/**
 * Get single employee
 *
 * @name GET /employees/:id
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.get("/employees/:id", authenticateToken, (req, res) =>
  getEmployee(req, res)
);

/**
 * Update single employee
 *
 * @name PUT /employees/:id
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.put("/employees/:id", authenticateToken, (req, res) =>
  updateEmployee(req, res)
);

/**
 * Delete single employee
 *
 * @name DELETE /employees/:id
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.delete("/employees/:id", authenticateToken, (req, res) =>
  deleteEmployee(req, res)
);

/**
 * Get list of departments
 *
 * @name GET /departments
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
routes.get("/departments", authenticateToken, (req, res) =>
  getDepartments(req, res)
);

export default routes;
