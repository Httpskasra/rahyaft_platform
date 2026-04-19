/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create a root department
  const dept = await prisma.department.upsert({
    where: { id: 'seed-dept-id' },
    update: {},
    create: { id: 'seed-dept-id', name: 'HQ' },
  });

  // 2. Create superadmin user

  const admin = await prisma.user.upsert({
    where: { phoneNumber: '09164532683' },
    update: {},
    create: {
      phoneNumber: '09164532683',
      name: 'Super Admin',
      departmentId: dept.id,
    },
  });

  // 3. Create role
  const role = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {},
    create: { name: 'superadmin' },
  });

  // 4. Create permissions for all actions + resources
  const actions = ['create', 'read', 'update', 'delete'];
  const resources = ['users', 'roles', 'departments','forms','form-submissions'];

  for (const action of actions) {
    for (const resource of resources) {
      const perm = await prisma.permission.upsert({
        where: { action_resource: { action, resource } },
        update: {},
        create: { action, resource },
      });

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
          scope: 'ORG_WIDE',
        },
      });
    }
  }

  // 5. Assign role to admin user
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
    update: {},
    create: { userId: admin.id, roleId: role.id },
  });

  console.log('✓ Seed complete — admin@company.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());