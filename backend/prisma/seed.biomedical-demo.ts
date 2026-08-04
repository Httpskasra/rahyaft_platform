/* eslint-disable no-console */
import {
  AiInsightLevel,
  CustomerActivityType,
  CustomerStatus,
  CustomerType,
  DepartmentRelationType,
  Gender,
  InterviewRecommendation,
  OccupationGroup,
  Prisma,
  PrismaClient,
  RecruitmentAction,
  RecruitmentActorType,
  RecruitmentApplicationStatus,
  RecruitmentFormType,
  RecruitmentStage,
  RepairStatus,
  RepairType,
  SalesOpportunityPriority,
  SalesOpportunityStatus,
  ScopeType,
  VisitResult,
} from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const now = new Date();
const daysFromNow = (days: number, hour = 9): Date => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const json = (value: unknown): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

const IDS = {
  departments: {
    root: 'bio-dept-root',
    executive: 'bio-dept-executive',
    hr: 'bio-dept-hr',
    sales: 'bio-dept-sales',
    clinical: 'bio-dept-clinical-engineering',
    service: 'bio-dept-service',
    quality: 'bio-dept-quality',
    warehouse: 'bio-dept-warehouse',
    finance: 'bio-dept-finance',
    it: 'bio-dept-it',
  },
  roles: {
    hrManager: 'bio-role-hr-manager',
    recruiter: 'bio-role-recruiter',
    technicalInterviewer: 'bio-role-technical-interviewer',
    serviceManager: 'bio-role-service-manager',
    technician: 'bio-role-technician',
    salesManager: 'bio-role-sales-manager',
    salesExpert: 'bio-role-sales-expert',
    quality: 'bio-role-quality',
  },
  users: {
    ceo: 'bio-user-ceo',
    hrManager: 'bio-user-hr-manager',
    recruiter: 'bio-user-recruiter',
    clinicalManager: 'bio-user-clinical-manager',
    technicalInterviewer: 'bio-user-technical-interviewer',
    serviceManager: 'bio-user-service-manager',
    technician1: 'bio-user-technician-1',
    technician2: 'bio-user-technician-2',
    salesManager: 'bio-user-sales-manager',
    sales1: 'bio-user-sales-1',
    quality: 'bio-user-quality',
    warehouse: 'bio-user-warehouse',
    finance: 'bio-user-finance',
    it: 'bio-user-it',
  },
};

async function upsertDepartment(id: string, name: string, parentId?: string) {
  return prisma.department.upsert({
    where: { id },
    update: { name, parentId: parentId ?? null },
    create: { id, name, parentId: parentId ?? null },
  });
}

async function upsertRole(id: string, name: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { id, name },
  });
}

async function upsertUser(data: {
  id: string;
  phoneNumber: string;
  name: string;
  employeeCode: string;
  departmentId: string;
  managerId?: string;
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
    where: { roleId_permissionId: { roleId, permissionId: permission.id } },
    update: { scope },
    create: { roleId, permissionId: permission.id, scope },
  });
}

async function seedOrganization() {
  console.log('1/9 Seeding biomedical organization...');

  await upsertDepartment(IDS.departments.root, 'شرکت مهندسی پزشکی راهیافت سلامت');
  await upsertDepartment(IDS.departments.executive, 'مدیریت ارشد', IDS.departments.root);
  await upsertDepartment(IDS.departments.hr, 'منابع انسانی', IDS.departments.root);
  await upsertDepartment(IDS.departments.sales, 'فروش تجهیزات پزشکی', IDS.departments.root);
  await upsertDepartment(IDS.departments.clinical, 'مهندسی بالینی و آموزش', IDS.departments.root);
  await upsertDepartment(IDS.departments.service, 'خدمات پس از فروش و تعمیرات', IDS.departments.root);
  await upsertDepartment(IDS.departments.quality, 'تضمین کیفیت و رگولاتوری', IDS.departments.root);
  await upsertDepartment(IDS.departments.warehouse, 'انبار قطعات و لجستیک', IDS.departments.root);
  await upsertDepartment(IDS.departments.finance, 'مالی و قراردادها', IDS.departments.root);
  await upsertDepartment(IDS.departments.it, 'فناوری اطلاعات', IDS.departments.root);

  const roles = {
    hrManager: await upsertRole(IDS.roles.hrManager, 'مدیر منابع انسانی'),
    recruiter: await upsertRole(IDS.roles.recruiter, 'کارشناس جذب و استخدام'),
    technicalInterviewer: await upsertRole(IDS.roles.technicalInterviewer, 'مصاحبه‌گر فنی مهندسی پزشکی'),
    serviceManager: await upsertRole(IDS.roles.serviceManager, 'مدیر خدمات فنی'),
    technician: await upsertRole(IDS.roles.technician, 'تکنسین تجهیزات پزشکی'),
    salesManager: await upsertRole(IDS.roles.salesManager, 'مدیر فروش تجهیزات پزشکی'),
    salesExpert: await upsertRole(IDS.roles.salesExpert, 'کارشناس فروش تجهیزات پزشکی'),
    quality: await upsertRole(IDS.roles.quality, 'کارشناس تضمین کیفیت'),
  };

  const recruitmentPermissions: Array<[string, string]> = [
    ['read', 'recruitment-applications'],
    ['review-initial', 'recruitment-applications'],
    ['conduct-initial-interview', 'recruitment-applications'],
    ['assign-technical-interviewer', 'recruitment-applications'],
    ['conduct-technical-interview', 'recruitment-interviews'],
    ['final-approve', 'recruitment-applications'],
    ['manage', 'recruitment-settings'],
  ];

  for (const [action, resource] of recruitmentPermissions) {
    await addPermission(roles.hrManager.id, action, resource, ScopeType.ORG_WIDE);
  }
  for (const [action, resource] of recruitmentPermissions.slice(0, 4)) {
    await addPermission(roles.recruiter.id, action, resource, ScopeType.ORG_WIDE);
  }
  await addPermission(
    roles.technicalInterviewer.id,
    'conduct-technical-interview',
    'recruitment-interviews',
    ScopeType.ORG_WIDE,
  );
  await addPermission(roles.technicalInterviewer.id, 'read', 'recruitment-applications', ScopeType.ORG_WIDE);

  for (const action of ['create', 'read', 'update', 'approve', 'assign']) {
    await addPermission(roles.serviceManager.id, action, 'repairs', ScopeType.DEPARTMENT_SUBTREE);
    await addPermission(roles.salesManager.id, action, 'customers', ScopeType.DEPARTMENT_SUBTREE);
  }
  await addPermission(roles.technician.id, 'read', 'repairs', ScopeType.TEAM);
  await addPermission(roles.technician.id, 'update', 'repairs', ScopeType.TEAM);
  await addPermission(roles.salesExpert.id, 'read', 'customers', ScopeType.TEAM);
  await addPermission(roles.salesExpert.id, 'create', 'customers', ScopeType.TEAM);
  await addPermission(roles.salesExpert.id, 'update', 'customers', ScopeType.TEAM);
  await addPermission(roles.quality.id, 'read', 'repairs', ScopeType.ORG_WIDE);
  await addPermission(roles.quality.id, 'approve', 'repairs', ScopeType.ORG_WIDE);

  const ceo = await upsertUser({
    id: IDS.users.ceo,
    phoneNumber: '09121001001',
    name: 'دکتر آرش نیک‌فر',
    employeeCode: 'BM-1001',
    departmentId: IDS.departments.executive,
  });
  const hrManager = await upsertUser({
    id: IDS.users.hrManager,
    phoneNumber: '09121001002',
    name: 'نازنین شریفی',
    employeeCode: 'BM-1101',
    departmentId: IDS.departments.hr,
    managerId: ceo.id,
  });
  const recruiter = await upsertUser({
    id: IDS.users.recruiter,
    phoneNumber: '09121001003',
    name: 'مریم جهانگیری',
    employeeCode: 'BM-1102',
    departmentId: IDS.departments.hr,
    managerId: hrManager.id,
  });
  const clinicalManager = await upsertUser({
    id: IDS.users.clinicalManager,
    phoneNumber: '09121001004',
    name: 'مهندس امیر رضوانی',
    employeeCode: 'BM-1201',
    departmentId: IDS.departments.clinical,
    managerId: ceo.id,
  });
  const technicalInterviewer = await upsertUser({
    id: IDS.users.technicalInterviewer,
    phoneNumber: '09121001005',
    name: 'مهندس سارا خلیلی',
    employeeCode: 'BM-1202',
    departmentId: IDS.departments.clinical,
    managerId: clinicalManager.id,
  });
  const serviceManager = await upsertUser({
    id: IDS.users.serviceManager,
    phoneNumber: '09121001006',
    name: 'مهندس بهزاد کاظمی',
    employeeCode: 'BM-1301',
    departmentId: IDS.departments.service,
    managerId: ceo.id,
  });
  const technician1 = await upsertUser({
    id: IDS.users.technician1,
    phoneNumber: '09121001007',
    name: 'محمدعلی حسینی',
    employeeCode: 'BM-1302',
    departmentId: IDS.departments.service,
    managerId: serviceManager.id,
  });
  const technician2 = await upsertUser({
    id: IDS.users.technician2,
    phoneNumber: '09121001008',
    name: 'علی اکبری',
    employeeCode: 'BM-1303',
    departmentId: IDS.departments.service,
    managerId: serviceManager.id,
  });
  const salesManager = await upsertUser({
    id: IDS.users.salesManager,
    phoneNumber: '09121001009',
    name: 'پویان احمدی',
    employeeCode: 'BM-1401',
    departmentId: IDS.departments.sales,
    managerId: ceo.id,
  });
  const sales1 = await upsertUser({
    id: IDS.users.sales1,
    phoneNumber: '09121001010',
    name: 'الهام مرادی',
    employeeCode: 'BM-1402',
    departmentId: IDS.departments.sales,
    managerId: salesManager.id,
  });
  const quality = await upsertUser({
    id: IDS.users.quality,
    phoneNumber: '09121001011',
    name: 'مهندس فرزانه باقری',
    employeeCode: 'BM-1501',
    departmentId: IDS.departments.quality,
    managerId: ceo.id,
  });
  const warehouse = await upsertUser({
    id: IDS.users.warehouse,
    phoneNumber: '09121001012',
    name: 'رضا توکلی',
    employeeCode: 'BM-1601',
    departmentId: IDS.departments.warehouse,
    managerId: ceo.id,
  });
  const finance = await upsertUser({
    id: IDS.users.finance,
    phoneNumber: '09121001013',
    name: 'سمیه محمودی',
    employeeCode: 'BM-1701',
    departmentId: IDS.departments.finance,
    managerId: ceo.id,
  });
  const it = await upsertUser({
    id: IDS.users.it,
    phoneNumber: '09121001014',
    name: 'کیوان رستگار',
    employeeCode: 'BM-1801',
    departmentId: IDS.departments.it,
    managerId: ceo.id,
  });

  await assignRole(hrManager.id, roles.hrManager.id);
  await assignRole(recruiter.id, roles.recruiter.id);
  await assignRole(technicalInterviewer.id, roles.technicalInterviewer.id);
  await assignRole(serviceManager.id, roles.serviceManager.id);
  await assignRole(technician1.id, roles.technician.id);
  await assignRole(technician2.id, roles.technician.id);
  await assignRole(salesManager.id, roles.salesManager.id);
  await assignRole(sales1.id, roles.salesExpert.id);
  await assignRole(quality.id, roles.quality.id);

  const userInfoRows = [
    [hrManager.id, 'نازنین', 'شریفی', '0051234567', 'مدیریت منابع انسانی', 'دانشگاه تهران'],
    [recruiter.id, 'مریم', 'جهانگیری', '0061234567', 'روانشناسی صنعتی', 'دانشگاه علامه طباطبایی'],
    [technicalInterviewer.id, 'سارا', 'خلیلی', '0071234567', 'مهندسی پزشکی بیوالکتریک', 'دانشگاه صنعتی امیرکبیر'],
    [technician1.id, 'محمدعلی', 'حسینی', '0081234567', 'مهندسی پزشکی', 'دانشگاه آزاد'],
    [sales1.id, 'الهام', 'مرادی', '0091234567', 'مهندسی پزشکی', 'دانشگاه علم و صنعت'],
  ] as const;

  for (const [userId, firstName, lastName, nationalCode, degree, university] of userInfoRows) {
    await prisma.userInfo.upsert({
      where: { userId },
      update: { firstName, lastName, nationalCode, degree, university, residence: 'تهران' },
      create: {
        userId,
        firstName,
        lastName,
        nationalCode,
        degree,
        university,
        birthDate: '1370/05/15',
        residence: 'تهران',
      },
    });
  }

  await prisma.departmentRelation.upsert({
    where: {
      fromDepartmentId_toDepartmentId_type: {
        fromDepartmentId: IDS.departments.quality,
        toDepartmentId: IDS.departments.service,
        type: DepartmentRelationType.AUDITS,
      },
    },
    update: {},
    create: {
      fromDepartmentId: IDS.departments.quality,
      toDepartmentId: IDS.departments.service,
      type: DepartmentRelationType.AUDITS,
    },
  });

  return { hrManager, recruiter, technicalInterviewer, serviceManager, technician1, technician2, salesManager, sales1, quality, warehouse, finance, it };
}

async function seedAttendance(users: Awaited<ReturnType<typeof seedOrganization>>) {
  console.log('2/9 Seeding attendance...');
  const attendanceUsers = [
    users.recruiter,
    users.technicalInterviewer,
    users.technician1,
    users.technician2,
    users.sales1,
    users.quality,
  ];

  for (let dayOffset = -9; dayOffset <= 0; dayOffset += 1) {
    const date = daysFromNow(dayOffset, 0);
    if ([0, 6].includes(date.getDay())) continue;
    for (let index = 0; index < attendanceUsers.length; index += 1) {
      const user = attendanceUsers[index];
      const checkIn = new Date(date);
      checkIn.setHours(8, 5 + index * 4, 0, 0);
      const checkOut = new Date(date);
      checkOut.setHours(16, 25 + index * 3, 0, 0);
      for (const checkTime of [checkIn, checkOut]) {
        await prisma.attendance.upsert({
          where: { userId_checkTime: { userId: user.id, checkTime } },
          update: {},
          create: { userId: user.id, date, checkTime, source: 'biomedical-demo-seed' },
        });
      }
    }
  }
}

async function seedCustomers(users: Awaited<ReturnType<typeof seedOrganization>>) {
  console.log('3/9 Seeding customers, contacts, sales and AI analyses...');

  const customers = [
    {
      id: 'bio-customer-hospital-mehr', type: CustomerType.ORGANIZATION, status: CustomerStatus.ACTIVE,
      organizationName: 'بیمارستان فوق تخصصی مهر', economicCode: 'BIO-ECO-1001', registrationNo: 'BIO-REG-1001', nationalId: '14001234001',
      mobile: '09122001001', phone: '02188771001', email: 'procurement@mehr-hospital.test', province: 'تهران', city: 'تهران',
      address: 'خیابان ولیعصر، بیمارستان مهر', postalCode: '1599911111', occupation: 'بیمارستان خصوصی', occupationGroup: OccupationGroup.OTHER,
    },
    {
      id: 'bio-customer-clinic-novin', type: CustomerType.ORGANIZATION, status: CustomerStatus.ACTIVE,
      organizationName: 'مرکز تصویربرداری نوین', economicCode: 'BIO-ECO-1002', registrationNo: 'BIO-REG-1002', nationalId: '14001234002',
      mobile: '09122001002', phone: '02144441002', email: 'info@novin-imaging.test', province: 'تهران', city: 'تهران',
      address: 'شهرک غرب، بلوار دریا', postalCode: '1466711111', occupation: 'مرکز تصویربرداری پزشکی', occupationGroup: OccupationGroup.OTHER,
    },
    {
      id: 'bio-customer-lab-pars', type: CustomerType.ORGANIZATION, status: CustomerStatus.ACTIVE,
      organizationName: 'آزمایشگاه تشخیص طبی پارس', economicCode: 'BIO-ECO-1003', registrationNo: 'BIO-REG-1003', nationalId: '14001234003',
      mobile: '09122001003', phone: '07132221003', email: 'lab@pars-lab.test', province: 'فارس', city: 'شیراز',
      address: 'بلوار چمران، ساختمان پزشکان پارس', postalCode: '7184811111', occupation: 'آزمایشگاه تشخیص طبی', occupationGroup: OccupationGroup.OTHER,
    },
    {
      id: 'bio-customer-clinic-ziba', type: CustomerType.ORGANIZATION, status: CustomerStatus.ACTIVE,
      organizationName: 'کلینیک پوست و زیبایی آریا', economicCode: 'BIO-ECO-1004', registrationNo: 'BIO-REG-1004', nationalId: '14001234004',
      mobile: '09122001004', phone: '02632221004', email: 'manager@aria-clinic.test', province: 'البرز', city: 'کرج',
      address: 'جهانشهر، بلوار مولانا', postalCode: '3149911111', occupation: 'کلینیک پوست و زیبایی', occupationGroup: OccupationGroup.HAIR_BEAUTY_CLINIC,
    },
    {
      id: 'bio-customer-person-doctor', type: CustomerType.PERSON, status: CustomerStatus.ACTIVE,
      firstName: 'دکتر نیلوفر', lastName: 'کامرانی', nationalCode: '0012233445', birthDate: '1364/08/20', gender: Gender.FEMALE,
      mobile: '09122001005', phone: '02122991005', email: 'n.kamrani@example.test', province: 'تهران', city: 'تهران',
      address: 'پاسداران، مطب تخصصی پوست', postalCode: '1666611111', occupation: 'متخصص پوست و مو', occupationGroup: OccupationGroup.DERMATOLOGIST,
    },
    {
      id: 'bio-customer-blacklisted', type: CustomerType.ORGANIZATION, status: CustomerStatus.BLACKLISTED,
      organizationName: 'شرکت تجهیزات درمانی سپهر', economicCode: 'BIO-ECO-1006', registrationNo: 'BIO-REG-1006', nationalId: '14001234006',
      mobile: '09122001006', phone: '02166551006', email: 'office@sepehr-med.test', province: 'تهران', city: 'تهران',
      address: 'کارگر شمالی', postalCode: '1417911111', occupation: 'توزیع‌کننده تجهیزات', occupationGroup: OccupationGroup.COLLEAGUE,
    },
  ] as const;

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: customer,
      create: customer,
    });
  }

  const contacts = [
    ['bio-contact-1', customers[0].id, 'خانم دکتر الهام محسنی', 'مدیر تجهیزات پزشکی', '09123001001', true],
    ['bio-contact-2', customers[0].id, 'آقای سعید نوری', 'مسئول تدارکات', '09123001002', false],
    ['bio-contact-3', customers[1].id, 'مهندس پیام نادری', 'مسئول فنی MRI', '09123001003', true],
    ['bio-contact-4', customers[2].id, 'دکتر مهناز احمدی', 'مدیر آزمایشگاه', '09123001004', true],
    ['bio-contact-5', customers[3].id, 'خانم فرشته رستمی', 'مدیر داخلی کلینیک', '09123001005', true],
  ] as const;
  for (const [id, customerId, fullName, role, mobile, isPrimary] of contacts) {
    await prisma.customerContact.upsert({
      where: { id },
      update: { fullName, role, mobile, isPrimary },
      create: { id, customerId, fullName, role, mobile, isPrimary },
    });
  }

  const opportunities = [
    ['bio-sale-1', customers[0].id, 'فروش دو دستگاه ونتیلاتور ICU', SalesOpportunityStatus.NEGOTIATION, SalesOpportunityPriority.URGENT, '3800000000', 75, 20],
    ['bio-sale-2', customers[1].id, 'قرارداد سرویس سالانه MRI', SalesOpportunityStatus.QUOTED, SalesOpportunityPriority.HIGH, '1250000000', 60, 35],
    ['bio-sale-3', customers[2].id, 'فروش آنالایزر بیوشیمی اتوماتیک', SalesOpportunityStatus.NEEDS_QUOTE, SalesOpportunityPriority.HIGH, '2750000000', 45, 45],
    ['bio-sale-4', customers[3].id, 'ارتقای دستگاه لیزر دایود', SalesOpportunityStatus.CONTACTED, SalesOpportunityPriority.MEDIUM, '950000000', 30, 55],
    ['bio-sale-5', customers[4].id, 'فروش دستگاه RF فرکشنال', SalesOpportunityStatus.WON, SalesOpportunityPriority.HIGH, '720000000', 100, -10],
    ['bio-sale-6', customers[5].id, 'فروش پمپ انفوزیون', SalesOpportunityStatus.LOST, SalesOpportunityPriority.LOW, '480000000', 0, -20],
  ] as const;
  for (const [id, customerId, title, status, priority, estimatedValue, probability, closeOffset] of opportunities) {
    await prisma.salesOpportunity.upsert({
      where: { id },
      update: { title, status, priority, estimatedValue, probability },
      create: {
        id, customerId, title, status, priority, estimatedValue, probability,
        description: `فرصت آزمایشی حوزه مهندسی پزشکی: ${title}`,
        expectedCloseAt: daysFromNow(closeOffset, 10),
        nextFollowUpAt: status === SalesOpportunityStatus.WON || status === SalesOpportunityStatus.LOST ? null : daysFromNow(3, 11),
        lossReason: status === SalesOpportunityStatus.LOST ? 'عدم اعتبارسنجی مالی مشتری و سابقه نامناسب پرداخت' : null,
      },
    });
  }

  const activities = [
    ['bio-activity-1', customers[0].id, CustomerActivityType.CALL, 'تماس با مدیر تجهیزات پزشکی', 'نیاز فوری ICU و درخواست دمو تا پایان هفته', 'bio-sale-1'],
    ['bio-activity-2', customers[0].id, CustomerActivityType.FOLLOW_UP, 'پیگیری تأیید بودجه ونتیلاتور', 'صورت‌جلسه کمیته خرید باید دریافت شود', 'bio-sale-1'],
    ['bio-activity-3', customers[1].id, CustomerActivityType.VISIT, 'بازدید فنی از MRI', 'بررسی وضعیت چیلر، کویل و خطاهای دوره‌ای', 'bio-sale-2'],
    ['bio-activity-4', customers[2].id, CustomerActivityType.NOTE, 'نیازسنجی آزمایشگاه', 'حجم روزانه حدود ۷۰۰ تست و نیاز به اتصال LIS', 'bio-sale-3'],
    ['bio-activity-5', customers[3].id, CustomerActivityType.SMS, 'ارسال کاتالوگ لیزر', 'کاتالوگ و شرایط گارانتی ارسال شد', 'bio-sale-4'],
  ] as const;
  for (const [id, customerId, type, title, body, relatedSalesOpportunityId] of activities) {
    await prisma.customerActivity.upsert({
      where: { id },
      update: { title, body },
      create: {
        id, customerId, type, title, body, relatedSalesOpportunityId,
        dueAt: type === CustomerActivityType.FOLLOW_UP ? daysFromNow(2, 9) : null,
        createdById: users.sales1.id,
      },
    });
  }

  const analyses = [
    ['bio-ai-1', customers[0].id, 'بیمارستان مهر مشتری کلیدی با نیاز فوری تجهیزات ICU و ظرفیت خرید بالا است.', AiInsightLevel.LOW, AiInsightLevel.HIGH, 'هماهنگی دمو ونتیلاتور و دریافت مصوبه کمیته خرید'],
    ['bio-ai-2', customers[1].id, 'مرکز تصویربرداری نوین برای قرارداد سرویس MRI آماده مذاکره نهایی است.', AiInsightLevel.MEDIUM, AiInsightLevel.HIGH, 'ارائه SLA دقیق و پیشنهاد قطعات مصرفی سالانه'],
    ['bio-ai-3', customers[2].id, 'آزمایشگاه پارس نیاز فنی مشخص و حجم تست مناسبی دارد اما قیمت حساس است.', AiInsightLevel.MEDIUM, AiInsightLevel.HIGH, 'ارسال دو سناریوی قیمت نقدی و اقساطی'],
    ['bio-ai-4', customers[5].id, 'به علت سابقه بد پرداخت و پرونده اختلافی، ادامه فروش بدون تضمین مالی پرریسک است.', AiInsightLevel.HIGH, AiInsightLevel.LOW, 'عدم ارائه اعتبار و ارجاع هر درخواست جدید به مدیریت مالی'],
  ] as const;
  for (const [id, customerId, summary, riskLevel, salesPotential, nextBestAction] of analyses) {
    await prisma.customerAiAnalysis.upsert({
      where: { id },
      update: { summary, riskLevel, salesPotential, nextBestAction },
      create: {
        id, customerId, summary, riskLevel, salesPotential, nextBestAction,
        tags: json(['مهندسی پزشکی', 'داده آزمایشی', salesPotential === AiInsightLevel.HIGH ? 'پتانسیل فروش بالا' : 'نیازمند کنترل ریسک']),
        insights: json({ salesAnalysis: summary, serviceAnalysis: 'سوابق تعمیرات و SLA در تصمیم بعدی لحاظ شود.', followUpAnalysis: nextBestAction }),
        source: 'biomedical-demo-seed', modelName: 'demo-medical-crm-v1',
      },
    });
  }

  return customers;
}

async function seedRepairs(users: Awaited<ReturnType<typeof seedOrganization>>, customers: Awaited<ReturnType<typeof seedCustomers>>) {
  console.log('4/9 Seeding repair cases...');
  const repairs = [
    {
      id: 'bio-repair-1', caseNumber: 'BM-R-1405-0001', customerId: customers[0].id, type: RepairType.ON_SITE,
      status: RepairStatus.IN_REPAIR, technicianId: users.technician1.id, deviceTitle: 'ونتیلاتور Dräger Savina 300', serialNumber: 'DRG-SV300-84921',
      problemDescription: 'خطای کاهش فشار و ناپایداری اکسیژن خروجی', description: 'نیاز به بررسی شیر اکسیژن و کالیبراسیون سنسور فشار',
      needCostApproval: true, estimatedCost: '18500000', startedAt: daysFromNow(-2, 10),
    },
    {
      id: 'bio-repair-2', caseNumber: 'BM-R-1405-0002', customerId: customers[1].id, type: RepairType.ON_SITE,
      status: RepairStatus.WAITING_COST_APPROVAL, technicianId: users.technician2.id, deviceTitle: 'MRI Siemens Magnetom Avanto', serialNumber: 'SMT-AVA-31008',
      problemDescription: 'خطای دمای چیلر و توقف اسکن پس از ۲۰ دقیقه', description: 'احتمال خرابی پمپ گردش آب و نیاز به قطعه وارداتی',
      needCostApproval: true, estimatedCost: '240000000', startedAt: daysFromNow(-3, 9),
    },
    {
      id: 'bio-repair-3', caseNumber: 'BM-R-1405-0003', customerId: customers[2].id, type: RepairType.IN_HOUSE,
      status: RepairStatus.QC, technicianId: users.technician1.id, deviceTitle: 'آنالایزر بیوشیمی Mindray BS-480', serialNumber: 'MDR-BS480-77012',
      problemDescription: 'عدم تکرارپذیری نتیجه تست قند', description: 'تعویض لامپ و انجام کالیبراسیون؛ در انتظار QC نهایی',
      needCostApproval: false, estimatedCost: '7600000', startedAt: daysFromNow(-5, 11),
    },
    {
      id: 'bio-repair-4', caseNumber: 'BM-R-1405-0004', customerId: customers[3].id, type: RepairType.IN_HOUSE,
      status: RepairStatus.READY_FOR_DELIVERY, technicianId: users.technician2.id, deviceTitle: 'لیزر دایود 808nm', serialNumber: 'LZR-808-99173',
      problemDescription: 'افت توان هندپیس', description: 'تعویض فیبر و تست خروجی انجام شد',
      needCostApproval: false, estimatedCost: '32500000', startedAt: daysFromNow(-7, 9), completedAt: daysFromNow(-1, 15),
    },
    {
      id: 'bio-repair-5', caseNumber: 'BM-R-1405-0005', customerId: customers[0].id, type: RepairType.ON_SITE,
      status: RepairStatus.DELIVERED, technicianId: users.technician1.id, deviceTitle: 'الکتروشوک Zoll R Series', serialNumber: 'ZOLL-R-55019',
      problemDescription: 'باتری شارژ نگه نمی‌دارد', description: 'باتری تعویض و تست تخلیه کامل انجام شد',
      needCostApproval: false, estimatedCost: '14000000', startedAt: daysFromNow(-15, 9), completedAt: daysFromNow(-9, 14),
    },
  ] as const;

  for (const repair of repairs) {
    await prisma.repairCase.upsert({
      where: { caseNumber: repair.caseNumber },
      update: repair,
      create: repair,
    });
  }

  const items = [
    ['bio-repair-item-1', repairs[0].id, 'سنسور فشار ونتیلاتور', 1, '12500000'],
    ['bio-repair-item-2', repairs[0].id, 'کیت اورینگ مسیر هوا', 1, '2800000'],
    ['bio-repair-item-3', repairs[1].id, 'پمپ گردش آب چیلر MRI', 1, '210000000'],
    ['bio-repair-item-4', repairs[2].id, 'لامپ فتومتر BS-480', 1, '5100000'],
    ['bio-repair-item-5', repairs[3].id, 'فیبر هندپیس لیزر', 1, '27500000'],
  ] as const;
  for (const [id, repairCaseId, title, quantity, unitPrice] of items) {
    await prisma.repairItem.upsert({
      where: { id },
      update: { title, quantity, unitPrice },
      create: { id, repairCaseId, title, quantity, unitPrice, description: 'قطعه تستی مربوط به Seed مهندسی پزشکی' },
    });
  }

  const visits = [
    ['bio-visit-1', repairs[0].id, users.technician1.id, -2, VisitResult.NEED_PART, 'عیب‌یابی انجام شد؛ سنسور فشار باید تعویض شود.'],
    ['bio-visit-2', repairs[1].id, users.technician2.id, -3, VisitResult.NEED_PART, 'خرابی پمپ چیلر تأیید شد و پیش‌فاکتور لازم است.'],
    ['bio-visit-3', repairs[4].id, users.technician1.id, -10, VisitResult.REPAIRED, 'باتری تعویض و دستگاه تحویل بخش اورژانس شد.'],
  ] as const;
  for (const [id, repairCaseId, technicianId, offset, result, notes] of visits) {
    const scheduledAt = daysFromNow(offset, 10);
    await prisma.repairVisit.upsert({
      where: { id },
      update: { result, notes },
      create: { id, repairCaseId, technicianId, scheduledAt, visitedAt: scheduledAt, result, notes },
    });
  }

  for (const repair of repairs) {
    await prisma.repairStatusLog.upsert({
      where: { id: `${repair.id}-status-current` },
      update: { newStatus: repair.status },
      create: {
        id: `${repair.id}-status-current`, repairCaseId: repair.id, oldStatus: RepairStatus.REGISTERED,
        newStatus: repair.status, changedById: users.serviceManager.id, reason: 'ایجاد وضعیت آزمایشی در Seed مهندسی پزشکی',
      },
    });
  }

  return repairs;
}

const preInterviewSchema = json({
  title: 'فرم پیش از مصاحبه مهندسی پزشکی',
  description: 'اطلاعات اولیه متقاضی همکاری در شرکت تجهیزات پزشکی',
  sections: [
    { id: 'education', title: 'تحصیلات و تجربه', fields: [
      { key: 'degree', type: 'select', label: 'آخرین مدرک تحصیلی', required: true, options: [
        { label: 'کارشناسی مهندسی پزشکی', value: 'BME_BSC' }, { label: 'کارشناسی ارشد مهندسی پزشکی', value: 'BME_MSC' },
        { label: 'مهندسی برق', value: 'EE' }, { label: 'سایر', value: 'OTHER' },
      ] },
      { key: 'specialization', type: 'select', label: 'گرایش تخصصی', required: true, options: [
        { label: 'بیوالکتریک', value: 'BIOELECTRIC' }, { label: 'بیومکانیک', value: 'BIOMECHANIC' },
        { label: 'بیومتریال', value: 'BIOMATERIAL' }, { label: 'تجهیزات پزشکی', value: 'MEDICAL_EQUIPMENT' },
      ] },
      { key: 'experienceYears', type: 'number', label: 'سابقه مرتبط (سال)', required: true, min: 0, max: 40 },
      { key: 'medicalDevices', type: 'textarea', label: 'تجهیزاتی که تجربه کار با آن‌ها را دارید', required: true },
      { key: 'travelAvailability', type: 'checkbox', label: 'امکان مأموریت و سفر کاری دارم', required: false },
      { key: 'startDate', type: 'date', label: 'تاریخ آمادگی شروع همکاری', required: true },
    ] },
  ],
});

const initialInterviewSchema = json({
  title: 'ارزیابی مصاحبه اولیه',
  sections: [{ id: 'hr', title: 'ارزیابی منابع انسانی', fields: [
    { key: 'communication', type: 'rating', label: 'مهارت ارتباطی', required: true, min: 1, max: 5 },
    { key: 'motivation', type: 'rating', label: 'انگیزه همکاری', required: true, min: 1, max: 5 },
    { key: 'salaryExpectation', type: 'number', label: 'حقوق مورد انتظار', required: true },
    { key: 'hrSummary', type: 'textarea', label: 'جمع‌بندی منابع انسانی', required: true },
  ] }],
});

const technicalInterviewSchema = json({
  title: 'ارزیابی فنی مهندسی پزشکی',
  sections: [{ id: 'technical', title: 'دانش و مهارت فنی', fields: [
    { key: 'electricalSafety', type: 'rating', label: 'ایمنی الکتریکی تجهیزات پزشکی', required: true, min: 1, max: 5 },
    { key: 'troubleshooting', type: 'rating', label: 'عیب‌یابی برد و تجهیزات', required: true, min: 1, max: 5 },
    { key: 'calibration', type: 'rating', label: 'کالیبراسیون و کنترل کیفی', required: true, min: 1, max: 5 },
    { key: 'documentation', type: 'rating', label: 'مستندسازی فنی', required: true, min: 1, max: 5 },
    { key: 'technicalNotes', type: 'textarea', label: 'جمع‌بندی فنی', required: true },
  ] }],
});

async function seedRecruitment(users: Awaited<ReturnType<typeof seedOrganization>>) {
  console.log('5/9 Seeding recruitment forms, jobs and applications...');

  const templates = [
    ['bio-recruitment-form-pre', 'فرم پیش از مصاحبه مهندسی پزشکی', RecruitmentFormType.PRE_INTERVIEW, preInterviewSchema],
    ['bio-recruitment-form-initial', 'فرم مصاحبه اولیه منابع انسانی', RecruitmentFormType.INITIAL_INTERVIEW, initialInterviewSchema],
    ['bio-recruitment-form-technical', 'فرم مصاحبه فنی مهندسی پزشکی', RecruitmentFormType.TECHNICAL_INTERVIEW, technicalInterviewSchema],
  ] as const;

  for (const [id, name, type] of templates) {
    await prisma.recruitmentFormTemplate.upsert({
      where: { id },
      update: { name, type, isActive: true },
      create: { id, name, type, isActive: true, description: 'فرم آزمایشی حوزه تجهیزات و مهندسی پزشکی' },
    });
  }
  for (const [templateId, , , schema] of templates) {
    await prisma.recruitmentFormVersion.upsert({
      where: { templateId_version: { templateId, version: 1 } },
      update: { schema, isPublished: true, publishedAt: daysFromNow(-20, 10) },
      create: { id: `${templateId}-v1`, templateId, version: 1, schema, isPublished: true, publishedAt: daysFromNow(-20, 10) },
    });
  }

  const hrRole = await prisma.role.findUniqueOrThrow({ where: { name: 'مدیر منابع انسانی' } });
  const jobs = [
    ['bio-job-service-engineer', 'مهندس خدمات پس از فروش تجهیزات پزشکی', 'service-engineer-medical-equipment', IDS.departments.service],
    ['bio-job-clinical-engineer', 'مهندس بالینی و کارشناس آموزش', 'clinical-engineer', IDS.departments.clinical],
    ['bio-job-medical-sales', 'کارشناس فروش تجهیزات پزشکی', 'medical-equipment-sales', IDS.departments.sales],
  ] as const;
  for (const [id, title, slug, departmentId] of jobs) {
    await prisma.jobOpening.upsert({
      where: { slug },
      update: { title, departmentId, isActive: true },
      create: {
        id, title, slug, departmentId, isActive: true,
        description: `${title}؛ آشنایی با تجهیزات بیمارستانی، مستندسازی و ارتباط حرفه‌ای با مراکز درمانی الزامی است.`,
        preInterviewFormId: templates[0][0], initialInterviewFormId: templates[1][0], technicalInterviewFormId: templates[2][0],
        initialReviewerRoleId: hrRole.id,
      },
    });
  }

  const applicants = [
    ['bio-applicant-1', 'مهندس رضا تهرانی', '09124001001', 'reza.tehrani@example.test', '1010101010'],
    ['bio-applicant-2', 'مهندس یلدا نوری', '09124001002', 'yalda.nouri@example.test', '2020202020'],
    ['bio-applicant-3', 'مهندس پارسا محمودی', '09124001003', 'parsa.mahmoudi@example.test', '3030303030'],
    ['bio-applicant-4', 'نگین امینی', '09124001004', 'negin.amini@example.test', '4040404040'],
    ['bio-applicant-5', 'مهندس آرمان سعیدی', '09124001005', 'arman.saeidi@example.test', '5050505050'],
  ] as const;
  for (const [id, fullName, phoneNumber, email, nationalCode] of applicants) {
    await prisma.recruitmentApplicant.upsert({
      where: { id },
      update: { fullName, phoneNumber, normalizedPhone: phoneNumber, email, nationalCode },
      create: { id, fullName, phoneNumber, normalizedPhone: phoneNumber, email, nationalCode },
    });
  }

  const applications = [
    { id: 'bio-application-initial-review', applicantId: applicants[0][0], jobOpeningId: jobs[0][0], stage: RecruitmentStage.INITIAL_REVIEW, status: RecruitmentApplicationStatus.IN_PROGRESS },
    { id: 'bio-application-initial-interview', applicantId: applicants[1][0], jobOpeningId: jobs[1][0], stage: RecruitmentStage.INITIAL_INTERVIEW, status: RecruitmentApplicationStatus.IN_PROGRESS },
    { id: 'bio-application-technical', applicantId: applicants[2][0], jobOpeningId: jobs[0][0], stage: RecruitmentStage.TECHNICAL_INTERVIEW, status: RecruitmentApplicationStatus.IN_PROGRESS },
    { id: 'bio-application-final', applicantId: applicants[3][0], jobOpeningId: jobs[2][0], stage: RecruitmentStage.SUPERADMIN_APPROVAL, status: RecruitmentApplicationStatus.IN_PROGRESS },
    { id: 'bio-application-rejected', applicantId: applicants[4][0], jobOpeningId: jobs[0][0], stage: RecruitmentStage.INITIAL_REVIEW, status: RecruitmentApplicationStatus.REJECTED },
  ] as const;

  for (let i = 0; i < applications.length; i += 1) {
    const app = applications[i];
    await prisma.recruitmentApplication.upsert({
      where: { id: app.id },
      update: {
        status: app.status, currentStage: app.stage,
        rejectionReasonInternal: app.status === RecruitmentApplicationStatus.REJECTED ? 'عدم تطابق تجربه عملی با نیاز موقعیت' : null,
        rejectionMessagePublic: app.status === RecruitmentApplicationStatus.REJECTED ? 'در این مرحله امکان ادامه فرایند همکاری وجود ندارد.' : null,
      },
      create: {
        id: app.id,
        trackingCode: `BMR-1405-${String(i + 1).padStart(4, '0')}`,
        publicTokenHash: hashToken(`biomedical-demo-public-token-${i + 1}`),
        applicantId: app.applicantId,
        jobOpeningId: app.jobOpeningId,
        status: app.status,
        currentStage: app.stage,
        submittedAt: daysFromNow(-(10 - i), 10),
        rejectedAt: app.status === RecruitmentApplicationStatus.REJECTED ? daysFromNow(-2, 12) : null,
        rejectionReasonInternal: app.status === RecruitmentApplicationStatus.REJECTED ? 'عدم تطابق تجربه عملی با نیاز موقعیت' : null,
        rejectionMessagePublic: app.status === RecruitmentApplicationStatus.REJECTED ? 'در این مرحله امکان ادامه فرایند همکاری وجود ندارد.' : null,
      },
    });

    await prisma.recruitmentFormSubmission.upsert({
      where: { applicationId_stage: { applicationId: app.id, stage: RecruitmentStage.PRE_INTERVIEW_FORM } },
      update: {},
      create: {
        id: `${app.id}-pre-submission`, applicationId: app.id, formVersionId: `${templates[0][0]}-v1`, stage: RecruitmentStage.PRE_INTERVIEW_FORM,
        answers: json({ degree: 'BME_BSC', specialization: i % 2 === 0 ? 'BIOELECTRIC' : 'MEDICAL_EQUIPMENT', experienceYears: 2 + i, medicalDevices: 'مانیتور علائم حیاتی، ونتیلاتور، الکتروشوک و پمپ انفوزیون', travelAvailability: true, startDate: '1405/06/01' }),
        submittedByType: RecruitmentActorType.APPLICANT,
      },
    });
  }

  for (const app of applications.slice(1, 4)) {
    await prisma.recruitmentFormSubmission.upsert({
      where: { applicationId_stage: { applicationId: app.id, stage: RecruitmentStage.INITIAL_INTERVIEW } },
      update: {},
      create: {
        id: `${app.id}-initial-submission`, applicationId: app.id, formVersionId: `${templates[1][0]}-v1`, stage: RecruitmentStage.INITIAL_INTERVIEW,
        answers: json({ communication: 4, motivation: 5, salaryExpectation: 45000000, hrSummary: 'ارتباط مناسب، انگیزه بالا و آمادگی برای مأموریت.' }),
        submittedByType: RecruitmentActorType.USER, submittedByUserId: users.recruiter.id,
      },
    });
  }

  for (const app of applications.slice(2, 4)) {
    await prisma.recruitmentAssignment.upsert({
      where: { id: `${app.id}-technical-assignment` },
      update: { assigneeUserId: users.technicalInterviewer.id },
      create: {
        id: `${app.id}-technical-assignment`, applicationId: app.id, stage: RecruitmentStage.TECHNICAL_INTERVIEW,
        assigneeUserId: users.technicalInterviewer.id, assignedByUserId: users.hrManager.id,
        completedAt: app.stage === RecruitmentStage.SUPERADMIN_APPROVAL ? daysFromNow(-1, 14) : null,
      },
    });
  }

  const technicalApps = [applications[2], applications[3]];
  for (let i = 0; i < technicalApps.length; i += 1) {
    const app = technicalApps[i];
    if (app.stage === RecruitmentStage.SUPERADMIN_APPROVAL) {
      await prisma.recruitmentFormSubmission.upsert({
        where: { applicationId_stage: { applicationId: app.id, stage: RecruitmentStage.TECHNICAL_INTERVIEW } },
        update: {},
        create: {
          id: `${app.id}-technical-submission`, applicationId: app.id, formVersionId: `${templates[2][0]}-v1`, stage: RecruitmentStage.TECHNICAL_INTERVIEW,
          answers: json({ electricalSafety: 4, troubleshooting: 4, calibration: 5, documentation: 4, technicalNotes: 'دانش فنی مناسب و تجربه کارگاهی قابل قبول دارد.' }),
          submittedByType: RecruitmentActorType.USER, submittedByUserId: users.technicalInterviewer.id,
        },
      });
      await prisma.technicalInterviewEvaluation.upsert({
        where: { applicationId: app.id },
        update: {},
        create: {
          id: `${app.id}-evaluation`, applicationId: app.id, interviewerId: users.technicalInterviewer.id,
          overallScore: 86, recommendation: InterviewRecommendation.HIRE,
          internalSummary: 'برای موقعیت فروش فنی مناسب است؛ آموزش محصول در ماه اول پیشنهاد می‌شود.',
        },
      });
    }
  }

  for (const app of applications) {
    await prisma.recruitmentTransition.upsert({
      where: { id: `${app.id}-transition-submit` },
      update: {},
      create: {
        id: `${app.id}-transition-submit`, applicationId: app.id, fromStage: RecruitmentStage.PRE_INTERVIEW_FORM,
        toStage: RecruitmentStage.INITIAL_REVIEW, action: RecruitmentAction.SUBMIT_PRE_INTERVIEW,
        actorType: RecruitmentActorType.APPLICANT, comment: 'ثبت اولیه درخواست همکاری',
      },
    });
  }
}

async function seedInternalForms(users: Awaited<ReturnType<typeof seedOrganization>>) {
  console.log('6/9 Seeding internal organization forms...');
  const forms = [
    {
      id: 'bio-form-service-report', customId: 'MED-SERVICE-REPORT', name: 'گزارش سرویس دوره‌ای تجهیزات پزشکی',
      description: 'ثبت چک‌لیست PM، ایمنی الکتریکی و نتیجه سرویس دوره‌ای',
      schema: json({ fields: [
        { id: 'device', type: 'text', label: 'نام دستگاه', required: true },
        { id: 'serial', type: 'text', label: 'شماره سریال', required: true },
        { id: 'electricalSafety', type: 'select', label: 'نتیجه ایمنی الکتریکی', options: ['PASS', 'FAIL'], required: true },
        { id: 'notes', type: 'textarea', label: 'توضیحات فنی', required: true },
      ] }),
    },
    {
      id: 'bio-form-product-training', customId: 'MED-TRAINING', name: 'گزارش آموزش کاربری تجهیزات',
      description: 'ثبت آموزش انجام‌شده برای کادر درمان',
      schema: json({ fields: [
        { id: 'center', type: 'text', label: 'مرکز درمانی', required: true },
        { id: 'device', type: 'text', label: 'دستگاه', required: true },
        { id: 'participants', type: 'number', label: 'تعداد شرکت‌کنندگان', required: true },
        { id: 'trainerNotes', type: 'textarea', label: 'جمع‌بندی مدرس', required: true },
      ] }),
    },
    {
      id: 'bio-form-purchase-request', customId: 'MED-PURCHASE-REQUEST', name: 'درخواست خرید قطعه پزشکی',
      description: 'درخواست خرید قطعات مصرفی و یدکی واحد فنی',
      schema: json({ fields: [
        { id: 'partName', type: 'text', label: 'نام قطعه', required: true },
        { id: 'quantity', type: 'number', label: 'تعداد', required: true },
        { id: 'urgency', type: 'select', label: 'فوریت', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], required: true },
      ] }),
    },
  ];

  for (const form of forms) {
    await prisma.form.upsert({
      where: { id: form.id },
      update: { name: form.name, description: form.description, schema: form.schema, isActive: true },
      create: { ...form, ownerId: users.hrManager.id, version: 1, isActive: true },
    });
  }

  await prisma.formSubmission.upsert({
    where: { id: 'bio-form-submission-service-1' },
    update: {},
    create: {
      id: 'bio-form-submission-service-1', formId: forms[0].id, formVersion: 1, userId: users.technician1.id,
      data: json({ device: 'ونتیلاتور Dräger Savina 300', serial: 'DRG-SV300-84921', electricalSafety: 'PASS', notes: 'آزمون نشتی و ایمنی الکتریکی انجام شد.' }),
    },
  });
  await prisma.formSubmission.upsert({
    where: { id: 'bio-form-submission-training-1' },
    update: {},
    create: {
      id: 'bio-form-submission-training-1', formId: forms[1].id, formVersion: 1, userId: users.technicalInterviewer.id,
      data: json({ center: 'بیمارستان مهر', device: 'ونتیلاتور ICU', participants: 12, trainerNotes: 'آموزش کاربری و هشدارهای دستگاه تکمیل شد.' }),
    },
  });
}

async function seedRepairActivities(repairs: Awaited<ReturnType<typeof seedRepairs>>, customers: Awaited<ReturnType<typeof seedCustomers>>, users: Awaited<ReturnType<typeof seedOrganization>>) {
  console.log('7/9 Linking repair activities...');
  for (let i = 0; i < repairs.length; i += 1) {
    const repair = repairs[i];
    await prisma.customerActivity.upsert({
      where: { id: `${repair.id}-customer-activity` },
      update: {},
      create: {
        id: `${repair.id}-customer-activity`, customerId: repair.customerId, type: CustomerActivityType.REPAIR_CREATED,
        title: `پرونده تعمیر ${repair.caseNumber}`, body: repair.problemDescription,
        relatedRepairId: repair.id, createdById: users.serviceManager.id,
      },
    });
  }
}

async function printSummary() {
  console.log('8/9 Collecting summary...');
  const [departments, users, customers, repairs, jobs, applications, forms] = await Promise.all([
    prisma.department.count({ where: { id: { startsWith: 'bio-' } } }),
    prisma.user.count({ where: { id: { startsWith: 'bio-' } } }),
    prisma.customer.count({ where: { id: { startsWith: 'bio-' } } }),
    prisma.repairCase.count({ where: { id: { startsWith: 'bio-' } } }),
    prisma.jobOpening.count({ where: { id: { startsWith: 'bio-' } } }),
    prisma.recruitmentApplication.count({ where: { id: { startsWith: 'bio-' } } }),
    prisma.form.count({ where: { id: { startsWith: 'bio-' } } }),
  ]);
  console.log({ departments, users, customers, repairs, jobs, applications, internalForms: forms });
}

async function main() {
  console.log('Starting biomedical engineering demo seed...');
  const users = await seedOrganization();
  await seedAttendance(users);
  const customers = await seedCustomers(users);
  const repairs = await seedRepairs(users, customers);
  await seedRecruitment(users);
  await seedInternalForms(users);
  await seedRepairActivities(repairs, customers, users);
  await printSummary();
  console.log('9/9 Biomedical demo seed completed successfully.');
  console.log('Run with: npx tsx prisma/seed.biomedical-demo.ts');
  console.log('Sample HR manager phone: 09121001002');
  console.log('Sample recruiter phone: 09121001003');
  console.log('Sample technical interviewer phone: 09121001005');
}

main()
  .catch((error) => {
    console.error('Biomedical demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
