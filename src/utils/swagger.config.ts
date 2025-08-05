import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

/**
 * Swagger configuration for the HRMS API
 * Provides interactive API documentation at /api-docs
 */

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HRMS API Documentation",
      version: "1.0.0",
      description:
        "A comprehensive API for managing employees and users in the HR Management System",
      contact: {
        name: "API Support",
        email: "support@company.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 4000}`,
        description: "Development server",
      },
      {
        url: "https://api.company.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer <token>",
        },
      },
      schemas: {
        Employee: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique identifier for the employee",
            },
            first_name: {
              type: "string",
              description: "Employee's first name",
            },
            last_name: {
              type: "string",
              description: "Employee's last name",
            },
            email: {
              type: "string",
              format: "email",
              description: "Employee's email address",
            },
            job_title: {
              type: "string",
              description: "Employee's job title",
            },
            department: {
              type: "string",
              description: "Employee's department",
            },
            joining_date: {
              type: "string",
              format: "date-time",
              description: "Employee's joining date",
            },
            status: {
              type: "string",
              enum: ["active", "inactive"],
              default: "active",
              description: "Employee's current status",
            },
            created_by: {
              type: "integer",
              description: "ID of the user who created this employee record",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the record was created",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the record was last updated",
            },
          },
          required: [
            "first_name",
            "last_name",
            "email",
            "job_title",
            "department",
            "joining_date",
            "created_by",
          ],
        },

        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Unique identifier for the user",
            },
            name: {
              type: "string",
              description: "User's full name",
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the user was created",
            },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "Timestamp when the user was last updated",
            },
          },
          required: ["name", "email"],
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error type or code",
            },
            message: {
              type: "string",
              description: "Detailed error message",
            },
            details: {
              type: "string",
              description: "Additional error details",
            },
          },
        },
        PaginationResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              description: "Array of items",
            },
            pagination: {
              type: "object",
              properties: {
                current_page: { type: "integer" },
                total_pages: { type: "integer" },
                total_count: { type: "integer" },
                has_next: { type: "boolean" },
                has_previous: { type: "boolean" },
              },
            },
          },
        },
        EmployeeCreateRequest: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string", format: "email" },
            job_title: { type: "string" },
            department: { type: "string" },
            joining_date: { type: "string", format: "date" },
            status: {
              type: "string",
              enum: ["active", "inactive"],
              default: "active",
            },
          },
          required: [
            "first_name",
            "last_name",
            "email",
            "job_title",
            "department",
            "joining_date",
          ],
        },
      },
    },
    tags: [
      {
        name: "Authentication",
        description: "User authentication operations",
      },
      {
        name: "Employees",
        description: "Employee management operations",
      },
      {
        name: "Users",
        description: "User management operations",
      },
      {
        name: "AI",
        description: "AI-powered employee creation using natural language",
      },
    ],
  },
  apis: ["./src/**/*.ts"], // This will include all TypeScript files in src directory
};

/**
 * Initialize Swagger documentation
 * @param app Express application instance
 */
export function setupSwagger(app: Express): void {
  const specs = swaggerJsdoc(swaggerOptions);

  // Mount Swagger documentation
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "HRMS API Documentation",
      customfavIcon: "/favicon.ico",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    })
  );
}

/**
 * Get Swagger specs for testing or external use
 * @returns Swagger specification object
 */
export function getSwaggerSpecs() {
  return swaggerJsdoc(swaggerOptions);
}
