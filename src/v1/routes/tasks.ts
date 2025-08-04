import { Router } from "express";
import { tasksFn } from "../controllers/task";

const routes = Router();

routes.get("/tasks", tasksFn);

export default routes;
