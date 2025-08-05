import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("123456", 12);
  const adminEmployee = await prisma.employee.create({
    data: {
      first_name: "Admin",
      last_name: "User",
      email: "admin@mkx.com",
      job_title: "System Administrator",
      department: "IT",
      joining_date: new Date(),
      status: "active",
      created_by: 0,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mkx.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@mkx.com",
      password: hashedPassword,
      role: "ADMIN",
      employee_id: adminEmployee.id,
    },
  });

  await prisma.employee.update({
    where: { id: adminEmployee.id },
    data: {
      created_by: adminUser.id,
    },
  });

  console.log("Admin user created with linked employee:", {
    id: adminUser.id,
    email: adminUser.email,
  });
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
