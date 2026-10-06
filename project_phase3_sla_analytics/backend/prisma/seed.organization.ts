/* eslint-disable prettier/prettier */
import { PrismaClient, ScopeType, DepartmentRelationType } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const IDS = {
  departments: {
    company: 'dept-company',
    executive: 'dept-executive',
    technology: 'dept-technology',
    backend: 'dept-backend',
    frontend: 'dept-frontend',
    infrastructure: 'dept-infrastructure',
    operations: 'dept-operations',
    repairs: 'dept-repairs',
    warehouse: 'dept-warehouse',
    sales: 'dept-sales',
    marketing: 'dept-marketing',
    finance: 'dept-finance',
    hr: 'dept-hr',
    quality: 'dept-quality',
  },
  users: {
    admin: 'user-super-admin',
    ceo: 'user-ceo',
    cto: 'user-cto',
    backendManager: 'user-backend-manager',
    backendExpert1: 'user-backend-expert-1',
    backendExpert2: 'user-backend-expert-2',
    frontendManager: 'user-frontend-manager',
    frontendExpert: 'user-frontend-expert',
    infrastructureManager: 'user-infrastructure-manager',
    devopsExpert: 'user-devops-expert',
    operationsDirector: 'user-operations-director',
    repairsManager: 'user-repairs-manager',
    technician1: 'user-technician-1',
    technician2: 'user-technician-2',
    warehouseManager: 'user-warehouse-manager',
    warehouseExpert: 'user-warehouse-expert',
    salesDirector: 'user-sales-director',
    salesManager: 'user-sales-manager',
    salesExpert1: 'user-sales-expert-1',
    salesExpert2: 'user-sales-expert-2',
    marketingManager: 'user-marketing-manager',
    marketingExpert: 'user-marketing-expert',
    financeManager: 'user-finance-manager',
    accountant: 'user-accountant',
    hrManager: 'user-hr-manager',
    hrExpert: 'user-hr-expert',
    qualityManager: 'user-quality-manager',
    qualityExpert: 'user-quality-expert',
  },
};

const actions = ['create', 'read', 'update', 'delete', 'approve', 'assign'];
const resources = [
  'users',
  'roles',
  'departments',
  'organization-chart',
  'forms',
  'form-submissions',
  'approvals',
  'user-info',
  'attendance',
  'repairs',
];

async function upsertDepartment(id: string, name: string, parentId: string | null = null) {
  return prisma.department.upsert({
    where: { id },
    update: { name, parentId },
    create: { id, name, parentId },
  });
}

async function upsertRole(name: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertUser(data: {
  id: string;
  phoneNumber: string;
  name: string;
  employeeCode: string;
  departmentId: string;
  managerId?: string | null;
}) {
  return prisma.user.upsert({
    where: { phoneNumber: data.phoneNumber },
    update: {
      name: data.name,
      employeeCode: data.employeeCode,
      departmentId: data.departmentId,
      managerId: data.managerId ?? null,
    },
    create: {
      id: data.id,
      phoneNumber: data.phoneNumber,
      name: data.name,
      employeeCode: data.employeeCode,
      departmentId: data.departmentId,
      managerId: data.managerId ?? null,
    },
  });
}

async function assignRole(userId: string, roleId: string) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
}

async function addPermission(
  roleId: string,
  action: string,
  resource: string,
  scope: ScopeType,
) {
  const permission = await prisma.permission.upsert({
    where: { action_resource: { action, resource } },
    update: {},
    create: { action, resource },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId,
        permissionId: permission.id,
      },
    },
    update: { scope },
    create: {
      roleId,
      permissionId: permission.id,
      scope,
    },
  });
}

async function addDepartmentRelation(
  fromDepartmentId: string,
  toDepartmentId: string,
  type: DepartmentRelationType,
) {
  await prisma.departmentRelation.upsert({
    where: {
      fromDepartmentId_toDepartmentId_type: {
        fromDepartmentId,
        toDepartmentId,
        type,
      },
    },
    update: {},
    create: {
      fromDepartmentId,
      toDepartmentId,
      type,
    },
  });
}

async function main() {
  console.log('Seeding organization structure...');

  // ---------------------------------------------------------------------------
  // 1. Organization departments
  // ---------------------------------------------------------------------------
  await upsertDepartment(IDS.departments.company, 'شرکت راهکار گستر هوشمند');

  await upsertDepartment(
    IDS.departments.executive,
    'مدیریت ارشد و دفتر مدیرعامل',
    IDS.departments.company,
  );

  await upsertDepartment(
    IDS.departments.technology,
    'معاونت فناوری اطلاعات',
    IDS.departments.company,
  );
  await upsertDepartment(
    IDS.departments.backend,
    'واحد توسعه بک‌اند',
    IDS.departments.technology,
  );
  await upsertDepartment(
    IDS.departments.frontend,
    'واحد توسعه فرانت‌اند',
    IDS.departments.technology,
  );
  await upsertDepartment(
    IDS.departments.infrastructure,
    'واحد زیرساخت و DevOps',
    IDS.departments.technology,
  );

  await upsertDepartment(
    IDS.departments.operations,
    'معاونت عملیات',
    IDS.departments.company,
  );
  await upsertDepartment(
    IDS.departments.repairs,
    'واحد تعمیرات و خدمات فنی',
    IDS.departments.operations,
  );
  await upsertDepartment(
    IDS.departments.warehouse,
    'واحد انبار و تدارکات',
    IDS.departments.operations,
  );

  await upsertDepartment(
    IDS.departments.sales,
    'معاونت فروش و توسعه بازار',
    IDS.departments.company,
  );
  await upsertDepartment(
    IDS.departments.marketing,
    'واحد بازاریابی و تبلیغات',
    IDS.departments.sales,
  );

  await upsertDepartment(
    IDS.departments.finance,
    'واحد مالی و حسابداری',
    IDS.departments.company,
  );
  await upsertDepartment(
    IDS.departments.hr,
    'واحد منابع انسانی',
    IDS.departments.company,
  );
  await upsertDepartment(
    IDS.departments.quality,
    'واحد تضمین کیفیت و بازرسی',
    IDS.departments.company,
  );

  // ---------------------------------------------------------------------------
  // 2. Roles
  // ---------------------------------------------------------------------------
  const roles = {
    superadmin: await upsertRole('superadmin'),
    ceo: await upsertRole('ceo'),
    director: await upsertRole('director'),
    departmentManager: await upsertRole('department-manager'),
    teamLead: await upsertRole('team-lead'),
    backendDeveloper: await upsertRole('backend-developer'),
    frontendDeveloper: await upsertRole('frontend-developer'),
    devopsEngineer: await upsertRole('devops-engineer'),
    repairTechnician: await upsertRole('repair-technician'),
    warehouseExpert: await upsertRole('warehouse-expert'),
    salesExpert: await upsertRole('sales-expert'),
    marketingExpert: await upsertRole('marketing-expert'),
    accountant: await upsertRole('accountant'),
    hrExpert: await upsertRole('hr-expert'),
    qualityInspector: await upsertRole('quality-inspector'),
    user: await upsertRole('user'),
  };

  // ---------------------------------------------------------------------------
  // 3. Permissions
  // ---------------------------------------------------------------------------
  for (const action of actions) {
    for (const resource of resources) {
      await addPermission(
        roles.superadmin.id,
        action,
        resource,
        ScopeType.ORG_WIDE,
      );
    }
  }

  // CEO and directors can read the complete organization chart.
  await addPermission(
    roles.ceo.id,
    'read',
    'organization-chart',
    ScopeType.ORG_WIDE,
  );
  await addPermission(
    roles.ceo.id,
    'read',
    'departments',
    ScopeType.ORG_WIDE,
  );
  await addPermission(
    roles.ceo.id,
    'read',
    'users',
    ScopeType.ORG_WIDE,
  );

  await addPermission(
    roles.director.id,
    'read',
    'organization-chart',
    ScopeType.DEPARTMENT_SUBTREE,
  );
  await addPermission(
    roles.director.id,
    'read',
    'departments',
    ScopeType.DEPARTMENT_SUBTREE,
  );
  await addPermission(
    roles.director.id,
    'read',
    'users',
    ScopeType.DEPARTMENT_SUBTREE,
  );

  await addPermission(
    roles.departmentManager.id,
    'read',
    'departments',
    ScopeType.DEPARTMENT,
  );
  await addPermission(
    roles.departmentManager.id,
    'read',
    'users',
    ScopeType.DEPARTMENT,
  );

  for (const action of actions) {
    await addPermission(
      roles.user.id,
      action,
      'user-info',
      ScopeType.SELF,
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Users and management hierarchy
  // ---------------------------------------------------------------------------
  const admin = await upsertUser({
    id: IDS.users.admin,
    phoneNumber: '09164532683',
    name: 'مدیر سامانه',
    employeeCode: '1000',
    departmentId: IDS.departments.executive,
  });

  const ceo = await upsertUser({
    id: IDS.users.ceo,
    phoneNumber: '09120000001',
    name: 'امیرحسین احمدی',
    employeeCode: '1001',
    departmentId: IDS.departments.executive,
  });

  const cto = await upsertUser({
    id: IDS.users.cto,
    phoneNumber: '09120000002',
    name: 'سارا محمدی',
    employeeCode: '1100',
    departmentId: IDS.departments.technology,
    managerId: ceo.id,
  });

  const backendManager = await upsertUser({
    id: IDS.users.backendManager,
    phoneNumber: '09120000003',
    name: 'رضا کریمی',
    employeeCode: '1110',
    departmentId: IDS.departments.backend,
    managerId: cto.id,
  });
  const backendExpert1 = await upsertUser({
    id: IDS.users.backendExpert1,
    phoneNumber: '09120000004',
    name: 'علی رضایی',
    employeeCode: '1111',
    departmentId: IDS.departments.backend,
    managerId: backendManager.id,
  });
  const backendExpert2 = await upsertUser({
    id: IDS.users.backendExpert2,
    phoneNumber: '09120000005',
    name: 'مریم حسینی',
    employeeCode: '1112',
    departmentId: IDS.departments.backend,
    managerId: backendManager.id,
  });

  const frontendManager = await upsertUser({
    id: IDS.users.frontendManager,
    phoneNumber: '09120000006',
    name: 'نیما اکبری',
    employeeCode: '1120',
    departmentId: IDS.departments.frontend,
    managerId: cto.id,
  });
  const frontendExpert = await upsertUser({
    id: IDS.users.frontendExpert,
    phoneNumber: '09120000007',
    name: 'الهام مرادی',
    employeeCode: '1121',
    departmentId: IDS.departments.frontend,
    managerId: frontendManager.id,
  });

  const infrastructureManager = await upsertUser({
    id: IDS.users.infrastructureManager,
    phoneNumber: '09120000008',
    name: 'پویا جعفری',
    employeeCode: '1130',
    departmentId: IDS.departments.infrastructure,
    managerId: cto.id,
  });
  const devopsExpert = await upsertUser({
    id: IDS.users.devopsExpert,
    phoneNumber: '09120000009',
    name: 'کیوان نادری',
    employeeCode: '1131',
    departmentId: IDS.departments.infrastructure,
    managerId: infrastructureManager.id,
  });

  const operationsDirector = await upsertUser({
    id: IDS.users.operationsDirector,
    phoneNumber: '09120000010',
    name: 'محسن شریفی',
    employeeCode: '1200',
    departmentId: IDS.departments.operations,
    managerId: ceo.id,
  });
  const repairsManager = await upsertUser({
    id: IDS.users.repairsManager,
    phoneNumber: '09120000011',
    name: 'حامد توکلی',
    employeeCode: '1210',
    departmentId: IDS.departments.repairs,
    managerId: operationsDirector.id,
  });
  const technician1 = await upsertUser({
    id: IDS.users.technician1,
    phoneNumber: '09120000012',
    name: 'سعید کاظمی',
    employeeCode: '1211',
    departmentId: IDS.departments.repairs,
    managerId: repairsManager.id,
  });
  const technician2 = await upsertUser({
    id: IDS.users.technician2,
    phoneNumber: '09120000013',
    name: 'یوسف قاسمی',
    employeeCode: '1212',
    departmentId: IDS.departments.repairs,
    managerId: repairsManager.id,
  });

  const warehouseManager = await upsertUser({
    id: IDS.users.warehouseManager,
    phoneNumber: '09120000014',
    name: 'مجتبی رستمی',
    employeeCode: '1220',
    departmentId: IDS.departments.warehouse,
    managerId: operationsDirector.id,
  });
  const warehouseExpert = await upsertUser({
    id: IDS.users.warehouseExpert,
    phoneNumber: '09120000015',
    name: 'سمانه صالحی',
    employeeCode: '1221',
    departmentId: IDS.departments.warehouse,
    managerId: warehouseManager.id,
  });

  const salesDirector = await upsertUser({
    id: IDS.users.salesDirector,
    phoneNumber: '09120000016',
    name: 'فرزاد رحیمی',
    employeeCode: '1300',
    departmentId: IDS.departments.sales,
    managerId: ceo.id,
  });
  const salesManager = await upsertUser({
    id: IDS.users.salesManager,
    phoneNumber: '09120000017',
    name: 'آرمان امینی',
    employeeCode: '1310',
    departmentId: IDS.departments.sales,
    managerId: salesDirector.id,
  });
  const salesExpert1 = await upsertUser({
    id: IDS.users.salesExpert1,
    phoneNumber: '09120000018',
    name: 'نگار عزیزی',
    employeeCode: '1311',
    departmentId: IDS.departments.sales,
    managerId: salesManager.id,
  });
  const salesExpert2 = await upsertUser({
    id: IDS.users.salesExpert2,
    phoneNumber: '09120000019',
    name: 'میلاد قربانی',
    employeeCode: '1312',
    departmentId: IDS.departments.sales,
    managerId: salesManager.id,
  });

  const marketingManager = await upsertUser({
    id: IDS.users.marketingManager,
    phoneNumber: '09120000020',
    name: 'بهاره موسوی',
    employeeCode: '1320',
    departmentId: IDS.departments.marketing,
    managerId: salesDirector.id,
  });
  const marketingExpert = await upsertUser({
    id: IDS.users.marketingExpert,
    phoneNumber: '09120000021',
    name: 'شادی کریمی',
    employeeCode: '1321',
    departmentId: IDS.departments.marketing,
    managerId: marketingManager.id,
  });

  const financeManager = await upsertUser({
    id: IDS.users.financeManager,
    phoneNumber: '09120000022',
    name: 'فاطمه محمودی',
    employeeCode: '1400',
    departmentId: IDS.departments.finance,
    managerId: ceo.id,
  });
  const accountant = await upsertUser({
    id: IDS.users.accountant,
    phoneNumber: '09120000023',
    name: 'زهرا زمانی',
    employeeCode: '1401',
    departmentId: IDS.departments.finance,
    managerId: financeManager.id,
  });

  const hrManager = await upsertUser({
    id: IDS.users.hrManager,
    phoneNumber: '09120000024',
    name: 'لیلا صادقی',
    employeeCode: '1500',
    departmentId: IDS.departments.hr,
    managerId: ceo.id,
  });
  const hrExpert = await upsertUser({
    id: IDS.users.hrExpert,
    phoneNumber: '09120000025',
    name: 'مهسا نوروزی',
    employeeCode: '1501',
    departmentId: IDS.departments.hr,
    managerId: hrManager.id,
  });

  const qualityManager = await upsertUser({
    id: IDS.users.qualityManager,
    phoneNumber: '09120000026',
    name: 'بهنام عباسی',
    employeeCode: '1600',
    departmentId: IDS.departments.quality,
    managerId: ceo.id,
  });
  const qualityExpert = await upsertUser({
    id: IDS.users.qualityExpert,
    phoneNumber: '09120000027',
    name: 'نرگس حیدری',
    employeeCode: '1601',
    departmentId: IDS.departments.quality,
    managerId: qualityManager.id,
  });

  // ---------------------------------------------------------------------------
  // 5. Assign roles to users
  // ---------------------------------------------------------------------------
  await assignRole(admin.id, roles.superadmin.id);
  await assignRole(ceo.id, roles.ceo.id);
  await assignRole(cto.id, roles.director.id);
  await assignRole(operationsDirector.id, roles.director.id);
  await assignRole(salesDirector.id, roles.director.id);

  for (const manager of [
    backendManager,
    frontendManager,
    infrastructureManager,
    repairsManager,
    warehouseManager,
    salesManager,
    marketingManager,
    financeManager,
    hrManager,
    qualityManager,
  ]) {
    await assignRole(manager.id, roles.departmentManager.id);
  }

  await assignRole(backendManager.id, roles.teamLead.id);
  await assignRole(frontendManager.id, roles.teamLead.id);
  await assignRole(infrastructureManager.id, roles.teamLead.id);

  await assignRole(backendExpert1.id, roles.backendDeveloper.id);
  await assignRole(backendExpert2.id, roles.backendDeveloper.id);
  await assignRole(frontendExpert.id, roles.frontendDeveloper.id);
  await assignRole(devopsExpert.id, roles.devopsEngineer.id);
  await assignRole(technician1.id, roles.repairTechnician.id);
  await assignRole(technician2.id, roles.repairTechnician.id);
  await assignRole(warehouseExpert.id, roles.warehouseExpert.id);
  await assignRole(salesExpert1.id, roles.salesExpert.id);
  await assignRole(salesExpert2.id, roles.salesExpert.id);
  await assignRole(marketingExpert.id, roles.marketingExpert.id);
  await assignRole(accountant.id, roles.accountant.id);
  await assignRole(hrExpert.id, roles.hrExpert.id);
  await assignRole(qualityExpert.id, roles.qualityInspector.id);

  // Give every employee the basic self-service role as well.
  const allUsers = [
    ceo,
    cto,
    backendManager,
    backendExpert1,
    backendExpert2,
    frontendManager,
    frontendExpert,
    infrastructureManager,
    devopsExpert,
    operationsDirector,
    repairsManager,
    technician1,
    technician2,
    warehouseManager,
    warehouseExpert,
    salesDirector,
    salesManager,
    salesExpert1,
    salesExpert2,
    marketingManager,
    marketingExpert,
    financeManager,
    accountant,
    hrManager,
    hrExpert,
    qualityManager,
    qualityExpert,
  ];

  for (const user of allUsers) {
    await assignRole(user.id, roles.user.id);
  }

  // ---------------------------------------------------------------------------
  // 6. Cross-department relationships shown by the organization chart
  // ---------------------------------------------------------------------------
  await addDepartmentRelation(
    IDS.departments.infrastructure,
    IDS.departments.backend,
    DepartmentRelationType.SUPPORTS,
  );
  await addDepartmentRelation(
    IDS.departments.infrastructure,
    IDS.departments.frontend,
    DepartmentRelationType.SUPPORTS,
  );
  await addDepartmentRelation(
    IDS.departments.warehouse,
    IDS.departments.repairs,
    DepartmentRelationType.SERVES,
  );
  await addDepartmentRelation(
    IDS.departments.marketing,
    IDS.departments.sales,
    DepartmentRelationType.COLLABORATES,
  );
  await addDepartmentRelation(
    IDS.departments.quality,
    IDS.departments.repairs,
    DepartmentRelationType.AUDITS,
  );
  await addDepartmentRelation(
    IDS.departments.finance,
    IDS.departments.sales,
    DepartmentRelationType.COLLABORATES,
  );
  await addDepartmentRelation(
    IDS.departments.hr,
    IDS.departments.technology,
    DepartmentRelationType.SERVES,
  );

  console.log('✓ Organization seed completed');
  console.log('✓ Admin phone: 09164532683');
  console.log(`✓ Departments: ${Object.keys(IDS.departments).length}`);
  console.log(`✓ Demo employees: ${allUsers.length + 1}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
