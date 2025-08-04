/**
 * Entry point for the Express server application.
 *
 * Sets up middleware for JSON parsing, cookies, CORS, and URL encoding.
 * Loads environment variables from .env file.
 * Mounts API routes under /api.
 * Starts the server on the specified port.
 */

import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import routes from "./routes";

// Load environment variables from .env file
dotenv.config({ quiet: true });

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

// Set the port from environment variable or default to 4000
const port = process.env.PORT || 4000;

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});