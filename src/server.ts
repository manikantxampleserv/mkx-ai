/**
 * Server startup and configuration.
 * Handles server initialization and startup logging.
 */

import { createApp } from "./app";

/**
 * Starts the HTTP server
 */
export const startServer = () => {
  // Create Express application
  const app = createApp();

  // Set the port from environment variable or default to 4000
  const port = process.env.PORT || 4000;

  // Start the server and listen on the specified port
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
  });
};
