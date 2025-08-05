import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  getUsersList,
  getUserStats,
  updateUser
} from "../controllers/user";

const routes = Router();

// User CRUD operations
routes.post("/users", (req, res) => createUser(req, res));           // Create
routes.get("/users", (req, res) => getUsersList(req, res));          // Read (list)
routes.get("/users/stats", (req, res) => getUserStats(req, res));    // Statistics
routes.get("/users/:id", (req, res) => getUser(req, res));           // Read (single)
routes.put("/users/:id", (req, res) => updateUser(req, res));       // Update
routes.delete("/users/:id", (req, res) => deleteUser(req, res));     // Delete

export default routes; 