import { Router } from "express";
import {
  createEmployee,
  deleteEmployee,
  getDepartments,
  getEmployee,
  getEmployeesList,
  getEmployeeStats,
  updateEmployee
} from "../controllers/employee";

const routes = Router();

// Employee CRUD operations
routes.post("/employees", (req, res) => createEmployee(req, res)); // Create via AI processing
routes.get("/employees", (req, res) => getEmployeesList(req, res));            // Read (list)
routes.get("/employees/stats", (req, res) => getEmployeeStats(req, res));   // Statistics
routes.get("/employees/:id", (req, res) => getEmployee(req, res));          // Read (single)
routes.put("/employees/:id", (req, res) => updateEmployee(req, res));       // Update
routes.delete("/employees/:id", (req, res) => deleteEmployee(req, res));    // Delete

// Department operations
routes.get("/departments", (req, res) => getDepartments(req, res));


export default routes;