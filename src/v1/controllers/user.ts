import prisma from "../../utils/prisma.config";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     tags: [Users]
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
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginationResponse'
 */
export async function getUsersList(req: Request, res: Response): Promise<void> {
  const { page = "1", limit = "10", search } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);

  const filters: any = {};
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const totalCount = await prisma.user.count({ where: filters });
  const users = await prisma.user.findMany({
    where: filters,
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { id: "desc" },
  });

  res.status(200).json({
    message: "Users retrieved successfully",
    data: users,
    pagination: {
      current_page: pageNum,
      total_pages: Math.ceil(totalCount / limitNum),
      total_count: totalCount,
      has_next: pageNum * limitNum < totalCount,
      has_previous: pageNum > 1,
    },
    filters: { search },
  });
}

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.status(200).json(user);
}

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User with email already exists
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["name", "email", "password"],
    });
    return;
  }

  // Check if user with email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    res.status(409).json({ error: "User with this email already exists" });
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  res.status(201).json({
    message: "User created successfully",
    user,
  });
}

/**
 * @swagger
 * /api/v1/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);
  const { name, email, password } = req.body;

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check email uniqueness if email is being updated
  if (email && email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email },
    });

    if (emailExists) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      created_at: true,
      updated_at: true,
    },
  });

  res.status(200).json({
    message: "User updated successfully",
    user: updatedUser,
  });
}

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  const id = parseInt(req.params.id);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(200).json({ message: "User deleted successfully" });
}

/**
 * @swagger
 * /api/v1/users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_users:
 *                   type: integer
 *                 users_created_this_month:
 *                   type: integer
 *                 users_created_this_year:
 *                   type: integer
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [totalUsers, usersThisMonth, usersThisYear] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        created_at: {
          gte: startOfMonth,
        },
      },
    }),
    prisma.user.count({
      where: {
        created_at: {
          gte: startOfYear,
        },
      },
    }),
  ]);

  res.status(200).json({
    message: "User statistics retrieved successfully",
    data: {
      total_users: totalUsers,
      users_created_this_month: usersThisMonth,
      users_created_this_year: usersThisYear,
    },
  });
}
