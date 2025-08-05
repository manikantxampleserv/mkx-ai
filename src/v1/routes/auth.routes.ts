import { Router } from "express";
import { login, register, getProfile } from "../controllers/auth.controller";
import { authenticateToken } from "../../middlewares/auth";

const routes = Router();

routes.post("/auth/register", (req, res) => register(req, res));
routes.post("/auth/login", (req, res) => login(req, res));
routes.get("/auth/me", authenticateToken, (req, res) => getProfile(req, res));

export default routes;
