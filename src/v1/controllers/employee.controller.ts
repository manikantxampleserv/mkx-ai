import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { Request, Response } from "express";
import prisma from "../../utils/prisma.config";
import { AuthRequest } from "@/middlewares/auth";
import bcryptjs from "bcryptjs";
import nodemailer from "nodemailer";
import logger from "../../config/logger";

export interface EmployeeData {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  start_date: string;
}

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn(
    "Warning: GEMINI_API_KEY not found. AI features will be disabled. Set it in your .env file to enable AI functionality."
  );
}

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Generate random password
function generateRandomPassword(length: number = 12): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  logger.info(`Generated password: ${password}`);
  return password;
}

// Send welcome email with login credentials
async function sendWelcomeEmail(
  employeeData: EmployeeData,
  password: string,
  loginUrl: string = process.env.LOGIN_URL || "http://localhost:3000/login"
): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: employeeData.email,
    subject: `Welcome to the Company - Your Login Credentials`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .credentials { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .login-button { 
            display: inline-block; 
            background-color: #4CAF50; 
            color: white; 
            padding: 12px 25px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 15px 0;
          }
          .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
          .warning { color: #ff6b6b; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Our Company!</h1>
          </div>
          <div class="content">
            <h2>Hello ${employeeData.first_name} ${employeeData.last_name},</h2>
            <p>Welcome to our team! We're excited to have you join us as a <strong>${employeeData.job_title}</strong> in the <strong>${employeeData.department}</strong> department.</p>
            
            <p>Your employee account has been created and you can now access our HR Management System using the credentials below:</p>
            
            <div class="credentials">
              <h3>Login Credentials:</h3>
              <p><strong>Email:</strong> ${employeeData.email}</p>
              <p><strong>Password:</strong> ${password}</p>
              <p><strong>Start Date:</strong> ${employeeData.start_date}</p>
            </div>
            
            <p class="warning">⚠️ Important: Please change your password after your first login for security purposes.</p>
            
            <a href="${loginUrl}" class="login-button">Login to HR System</a>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our HR department.</p>
            
            <p>We look forward to working with you!</p>
            
            <p>Best regards,<br>HR Department</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you believe you received this email in error, please contact our HR department.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${employeeData.email}`);
  } catch (error) {
    console.error(
      `Failed to send welcome email to ${employeeData.email}:`,
      error
    );
    throw new Error(`Email sending failed: ${(error as Error).message}`);
  }
}

// Create or skip employee if email exists, and create associated user
export async function createEmployeeRecordInHRMS(
  employeeData: EmployeeData,
  userId: number | undefined
) {
  // Check if employee already exists
  const existingEmployee = await prisma.employee.findUnique({
    where: { email: employeeData.email },
  });

  if (existingEmployee) {
    return {
      status: "skipped",
      message: `Employee with email ${employeeData.email} already exists.`,
      employee_id: existingEmployee.id,
    };
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: employeeData.email },
  });

  if (existingUser) {
    return {
      status: "error",
      message: `User with email ${employeeData.email} already exists.`,
    };
  }

  // Generate random password
  const plainPassword = generateRandomPassword();
  const hashedPassword = await bcryptjs.hash(plainPassword, 10);

  try {
    // Use Prisma transaction to ensure both employee and user are created together
    const result = await prisma.$transaction(async (tx) => {
      // Create employee first
      const newEmployee = await tx.employee.create({
        data: {
          first_name: employeeData.first_name,
          last_name: employeeData.last_name,
          email: employeeData.email,
          job_title: employeeData.job_title,
          department: employeeData.department,
          joining_date: new Date(employeeData.start_date),
          created_by: userId || 1,
        },
      });

      // Create associated user account
      const newUser = await tx.user.create({
        data: {
          name: `${employeeData.first_name} ${employeeData.last_name}`,
          email: employeeData.email,
          password: hashedPassword,
          role: "EMPLOYEE", // Default role, can be changed later
          employee_id: newEmployee.id,
        },
      });

      return { employee: newEmployee, user: newUser };
    });

    // Send welcome email with login credentials
    try {
      await sendWelcomeEmail(employeeData, plainPassword);

      return {
        status: "success",
        message:
          "Employee record and user account created successfully. Welcome email sent.",
        employee_id: result.employee.id,
        user_id: result.user.id,
        email_sent: true,
      };
    } catch (emailError) {
      // Employee and user were created but email failed
      console.error("Email sending failed:", emailError);
      return {
        status: "partial_success",
        message:
          "Employee record and user account created successfully, but welcome email failed to send.",
        employee_id: result.employee.id,
        user_id: result.user.id,
        email_sent: false,
        email_error: (emailError as Error).message,
      };
    }
  } catch (error) {
    console.error("Transaction failed:", error);
    return {
      status: "error",
      message: `Failed to create employee and user: ${
        (error as Error).message
      }`,
    };
  }
}

function extractJsonFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

/**
 * @swagger
 * /api/v1/employees:
 *   post:
 *     summary: Create employee using AI processing (includes user account creation and email notification)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Natural language description of employee(s) to create
 *     responses:
 *       200:
 *         description: Employee(s) and user accounts processed successfully
 *       503:
 *         description: AI service not available
 */
export async function createEmployee(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const promptText = req.body?.prompt;
  const userId = req.user?.userId;

  if (!promptText) {
    res.status(400).json({ error: "Missing 'prompt' field in request." });
    return;
  }

  // Validate email configuration
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "Warning: SMTP credentials not configured. Email notifications will fail."
    );
  }

  const prompt = `You are an AI assistant for an HR department. Your task is to extract information for one or more employees from the provided text and format it into a JSON array of objects.

     Each object in the array must contain the following required fields:
     - first_name (string)
     - last_name (string)
     - email (string)
     - job_title (string)
     - department (string)
     - start_date (YYYY-MM-DD format)

     IMPORTANT: Return ONLY a valid JSON array of objects, without any markdown formatting, code blocks, or additional text.

     Rules:
     1. If start date/joining date is not provided, use today's date: ${
       new Date().toISOString().split("T")[0]
     }
     2. If any information for a field is missing or unclear, use "unknown".
     3. Ensure email addresses are in a valid format.
     4. Use proper capitalization for names and titles.
     5. Fix grammatical errors in department and job titles (e.g., "haman rsoure" to "Human Resource").
     6. If department or job title is not provided, use a related department or job title.
     7. Extract the closest possible match even if there are typos.
     8. Extract only factual information from the text.
     9. Return the response as a JSON array with objects following the specified structure.

     Example Text for multiple employees:
     "Please create new records for three new hires. First, John Doe, a Software Engineer in the Engineering department starting on 2025-09-01, his email is john.doe@company.com. Second, Jane Smith, a Product Manager in the Product department starting on 2025-09-05, her email is jane.smith@company.com. Finally, Mark Johnson will be joining as a Senior Data Scientist in the Data Science department with a start date of 2025-10-01, his email is mark.johnson@company.com."

     Expected JSON Output:
     [
       {
         "first_name": "John",
         "last_name": "Doe",
         "email": "john.doe@company.com",
         "job_title": "Software Engineer",
         "department": "Engineering",
         "start_date": "2025-09-01"
       },
       {
         "first_name": "Jane",
         "last_name": "Smith",
         "email": "jane.smith@company.com",
         "job_title": "Product Manager",
         "department": "Product",
         "start_date": "2025-09-05"
       },
       {
         "first_name": "Mark",
         "last_name": "Johnson",
         "email": "mark.johnson@company.com",
         "job_title": "Senior Data Scientist",
         "department": "Data Science",
         "start_date": "2025-10-01"
       }
     ]
Text to process:
${promptText}`;

  if (!ai) {
    res.status(503).json({
      error:
        "AI service is not available. Please set GEMINI_API_KEY in your .env file to enable AI functionality.",
      message:
        "To use this endpoint, you need to set up a Gemini API key. Visit https://makersuite.google.com/app/apikey to get one.",
    });
    return;
  }

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJsonString = extractJsonFromMarkdown(rawResponse as string);
    const employeesData: EmployeeData[] = JSON.parse(cleanJsonString);

    const hrmsResponses = [];
    for (const employeeData of employeesData) {
      const hrmsResponse = await createEmployeeRecordInHRMS(
        employeeData,
        userId
      );
      hrmsResponses.push({ ...employeeData, hrms_api_status: hrmsResponse });
    }

    // Count successful creations and email notifications
    const successCount = hrmsResponses.filter(
      (r) => r.hrms_api_status.status === "success"
    ).length;
    const partialSuccessCount = hrmsResponses.filter(
      (r) => r.hrms_api_status.status === "partial_success"
    ).length;
    const emailsSentCount = hrmsResponses.filter(
      (r) => r.hrms_api_status.email_sent === true
    ).length;

    res.status(200).json({
      message: "Employees processed successfully",
      method: req.method,
      summary: {
        total_processed: employeesData.length,
        successful_creations: successCount + partialSuccessCount,
        emails_sent: emailsSentCount,
        skipped: hrmsResponses.filter(
          (r) => r.hrms_api_status.status === "skipped"
        ).length,
        errors: hrmsResponses.filter(
          (r) => r.hrms_api_status.status === "error"
        ).length,
      },
      processed_employees: hrmsResponses,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error processing employee creation",
      details: (error as Error).message,
    });
  }
}

// Rest of the existing functions remain the same...

export async function getEmployeesList(
  req: Request,
  res: Response
): Promise<void> {
  const { department, status, page = "1", limit = "10", search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const filters: any = {};
  if (department) filters.department = department;
  if (status) filters.status = status;
  if (search) {
    filters.OR = [
      { first_name: { contains: search, mode: "insensitive" } },
      { last_name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { job_title: { contains: search, mode: "insensitive" } },
    ];
  }

  const totalCount = await prisma.employee.count({ where: filters });
  const employees = await prisma.employee.findMany({
    where: filters,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { id: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          created_at: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Employees retrieved successfully",
    data: employees,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_count: totalCount,
      has_next: pageNum * limitNum < totalCount,
      has_previous: pageNum > 1,
    },
    filters: { department, status, search },
  });
}

export async function getEmployee(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          created_at: true,
          updated_at: true,
        },
      },
    },
  });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.status(200).json(employee);
}

export async function updateEmployee(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id },
    data: req.body,
  });

  res.status(200).json({
    message: "Employee updated successfully",
    employee: updatedEmployee,
  });
}

export async function deleteEmployee(
  req: Request,
  res: Response
): Promise<void> {
  const id = parseInt(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }

  // Delete employee (user will be deleted via cascade)
  await prisma.employee.delete({ where: { id } });
  res.status(200).json({
    message: "Employee and associated user account deleted successfully",
  });
}

export async function getDepartments(
  req: Request,
  res: Response
): Promise<void> {
  const departments = await prisma.employee.groupBy({
    by: ["department"],
    _count: {
      department: true,
    },
  });

  const departmentList = departments.map((dept: any) => ({
    department: dept.department,
    count: dept._count.department,
  }));

  res.status(200).json({
    message: "Departments retrieved successfully",
    data: departmentList,
  });
}

export async function getEmployeeStats(
  req: Request,
  res: Response
): Promise<void> {
  const [totalEmployees, activeEmployees, inactiveEmployees, departmentStats] =
    await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: "active" } }),
      prisma.employee.count({ where: { status: "inactive" } }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: {
          department: true,
        },
      }),
    ]);

  const formattedDepartmentStats = departmentStats.map((stat: any) => ({
    department: stat.department,
    count: stat._count.department,
  }));

  res.status(200).json({
    message: "Employee statistics retrieved successfully",
    data: {
      total_employees: totalEmployees,
      active_employees: activeEmployees,
      inactive_employees: inactiveEmployees,
      department_stats: formattedDepartmentStats,
    },
  });
}
