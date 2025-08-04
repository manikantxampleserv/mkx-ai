import { Request, Response, Router } from "express";

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

export default routes;
