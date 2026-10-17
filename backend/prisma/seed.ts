import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { ALL_PERMISSIONS } from '../src/common/permissions/permission-catalog';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ROOT_DEPARTMENT_ID = '00000000-0000-4000-8000-000000000001';
const SUPER_ADMIN_PHONE = '09164532683';

async function main() {
  const department = await prisma.department.upsert({
    where: { id: ROOT_DEPARTMENT_ID },
    update: { name: 'مدیریت کل' },
    create: { id: ROOT_DEPARTMENT_ID, name: 'مدیریت کل' },
  });

  const admin = await prisma.user.upsert({
    where: { phoneNumber: SUPER_ADMIN_PHONE },
    update: {
      name: 'Super Admin',
      departmentId: department.id,
      employeeCode: 'SUPERADMIN-001',
    },
    create: {
      phoneNumber: SUPER_ADMIN_PHONE,
      name: 'Super Admin',
      departmentId: department.id,
      employeeCode: 'SUPERADMIN-001',
    },
  });

  const role = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {},
    create: { name: 'superadmin' },
  });

  for (const { action, resource } of ALL_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { action_resource: { action, resource } },
      update: {},
      create: { action, resource },
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: { scope: 'ORG_WIDE', relationType: null },
      create: { roleId: role.id, permissionId: permission.id, scope: 'ORG_WIDE' },
    });
  }

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
    update: {},
    create: { userId: admin.id, roleId: role.id },
  });

  console.log(`✓ Seed complete — only Super Admin seed data created (${SUPER_ADMIN_PHONE})`);
  console.log(`✓ Root department ID: ${ROOT_DEPARTMENT_ID}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
