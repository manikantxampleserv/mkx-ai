import { Request, Response, Router } from "express";
import employeeRoutes from "./employee";
import userRoutes from "./user";

const routes = Router();

/**
 * Root route handler.
 * @route GET /
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
routes.get("/", (_: Request, res: Response) => {
  res.send("Hello, TypeScript Express!");
});

// Mount route modules
routes.use("/v1", employeeRoutes);
routes.use("/v1", userRoutes);

export default routes;
