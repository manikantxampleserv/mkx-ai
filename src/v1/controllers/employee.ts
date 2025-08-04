import prisma from '../../utils/prisma.config';
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { Request, Response } from 'express';

export interface EmployeeData {
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  start_date: string;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY not found. Please set it in your .env file.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Create or skip employee if email exists
export async function createEmployeeRecordInHRMS(employeeData: EmployeeData) {
  const existingEmployee = await prisma.employee.findUnique({
    where: { email: employeeData.email },
  });

  if (existingEmployee) {
    return {
      status: 'skipped',
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
      created_by: 1, // Replace with dynamic user ID if needed
    },
  });

  return {
    status: 'success',
    message: 'Employee record created successfully.',
    employee_id: newEmployee.id
  };
}

function extractJsonFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const promptText = req.body.prompt;
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
     1. If start date/joining date is not provided, use today's date: ${new Date().toISOString().split('T')[0]}
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

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJsonString = extractJsonFromMarkdown(rawResponse as string);
    const employeesData: EmployeeData[] = JSON.parse(cleanJsonString);

    const hrmsResponses = [];
    for (const employeeData of employeesData) {
      const hrmsResponse = await createEmployeeRecordInHRMS(employeeData);
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
      details: (error as Error).message
    });
  }
}

export async function getEmployeesList(req: Request, res: Response): Promise<void> {
  const { department, status, page = '1', limit = '10', search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const filters: any = {};
  if (department) filters.department = department;
  if (status) filters.status = status;
  if (search) {
    filters.OR = [
      { first_name: { contains: search, mode: 'insensitive' } },
      { last_name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { job_title: { contains: search, mode: 'insensitive' } },
    ];
  }

  const totalCount = await prisma.employee.count({ where: filters });
  const employees = await prisma.employee.findMany({
    where: filters,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    orderBy: { id: 'desc' },
  });

  res.status(200).json({
    message: "Employees retrieved successfully",
    data: employees,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_count: totalCount,
      has_next: pageNum * limitNum < totalCount,
      has_previous: pageNum > 1
    },
    filters: { department, status, search }
  });
}

export async function getEmployee(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.status(200).json({ message: "Success", data: employee });
}

export async function updateEmployee(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { ...req.body, updated_at: new Date() },
    });
    res.status(200).json({ message: "Updated successfully", data: updated });
  } catch (error) {
    res.status(500).json({ error: "Error updating employee", details: (error as Error).message });
  }
}

export async function deleteEmployee(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  try {
    const deleted = await prisma.employee.delete({ where: { id } });
    res.status(200).json({ message: "Deleted successfully", data: deleted });
  } catch (error) {
    res.status(500).json({ error: "Error deleting employee", details: (error as Error).message });
  }
}

export async function getDepartments(req: Request, res: Response): Promise<void> {
  const departments = await prisma.employee.groupBy({ by: ['department'] });
  res.status(200).json({ message: "Departments retrieved", data: departments.map((d: { department: string }) => d.department) });
}

export async function getEmployeeStats(req: Request, res: Response): Promise<void> {
  const total = await prisma.employee.count();
  const active = await prisma.employee.count({ where: { status: 'active' } });
  const inactive = await prisma.employee.count({ where: { status: 'inactive' } });
  const breakdownRaw = await prisma.employee.groupBy({ by: ['department'], _count: { _all: true } });
  const breakdown = Object.fromEntries(breakdownRaw.map((d: { department: string, _count: { _all: number } }) => [d.department, d._count._all]));
  res.status(200).json({
    data: {
      total_employees: total,
      active_employees: active,
      inactive_employees: inactive,
      department_breakdown: breakdown
    }
  });
}
