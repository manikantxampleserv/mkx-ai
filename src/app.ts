/**
 * Express application configuration.
 * Sets up middleware, routes, and application-level configurations.
 */

import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import routes from "./routes";
import { setupSwagger } from "./utils/swagger.config";

/**
 * Creates and configures the Express application
 * @returns {Application} Configured Express application
 */
export const createApp = (): Application => {
  // Create an Express application
  const app = express();

  // IMPORTANT: Set up middleware BEFORE mounting routes
  // Middleware to parse JSON bodies
  app.use(express.json());

  // Middleware to parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Middleware to parse cookies
  app.use(cookieParser());

  // Enable CORS for all origins with credentials
  app.use(cors({ origin: "*", credentials: true }));

  // Mount API routes under /api (AFTER middleware setup)
  app.use("/api", routes);

  // Setup Swagger documentation
  setupSwagger(app);

  return app;
};
