import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { Request, Response } from "express";
import prisma from "../../utils/prisma.config";
import { AuthRequest } from "@/middlewares/auth";

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

// Create or skip employee if email exists
export async function createEmployeeRecordInHRMS(
  employeeData: EmployeeData,
  employeeId: number | undefined
) {
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

  const newEmployee = await prisma.employee.create({
    data: {
      first_name: employeeData.first_name,
      last_name: employeeData.last_name,
      email: employeeData.email,
      job_title: employeeData.job_title,
      department: employeeData.department,
      joining_date: new Date(employeeData.start_date),
      created_by: employeeId || 1,
    },
  });

  return {
    status: "success",
    message: "Employee record created successfully.",
    employee_id: newEmployee.id,
  };
}

function extractJsonFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

/**
 * @swagger
 * /api/v1/employees:
 *   post:
 *     summary: Create employee using AI processing
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
 *         description: Employee(s) processed successfully
 *       503:
 *         description: AI service not available
 */
export async function createEmployee(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const promptText = req.body?.prompt;
  const employeeId = req.user?.employeeId;
  if (!promptText) {
    res.status(400).json({ error: "Missing 'prompt' field in request." });
    return;
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
        employeeId
      );
      hrmsResponses.push({ ...employeeData, hrms_api_status: hrmsResponse });
    }

    res.status(200).json({
      message: "Employees processed successfully",
      method: req.method,
      processed_employees: hrmsResponses,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error processing employee creation",
      details: (error as Error).message,
    });
  }
}

/**
 * @swagger
 * /api/v1/employees:
 *   get:
 *     summary: Get all employees with pagination and filtering
 *     tags: [Employees]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 */
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

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
export async function getEmployee(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.status(200).json(employee);
}

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   put:
 *     summary: Update employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeCreateRequest'
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 */
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

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 */
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

  await prisma.employee.delete({ where: { id } });
  res.status(200).json({ message: "Employee deleted successfully" });
}

/**
 * @swagger
 * /api/v1/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
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

/**
 * @swagger
 * /api/v1/employees/stats:
 *   get:
 *     summary: Get employee statistics
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Employee statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_employees:
 *                   type: integer
 *                 active_employees:
 *                   type: integer
 *                 inactive_employees:
 *                   type: integer
 *                 department_stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       department:
 *                         type: string
 *                       count:
 *                         type: integer
 */
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
