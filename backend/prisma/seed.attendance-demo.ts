/* eslint-disable prettier/prettier */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SOURCE = 'mock-seed-v1';
const DEFAULT_DAYS = 45;

/**
 * Attendance mock seed
 * --------------------
 * هدف: ساخت دیتای واقع‌گرایانه برای تست داشبورد گزارش حضور و غیاب.
 *
 * این Seed:
 * - User/Department جدید نمی‌سازد و از کاربران واقعی Seed سازمان استفاده می‌کند.
 * - فقط داده‌هایی را حذف می‌کند که قبلاً خودش با source=mock-seed-v1 ساخته است.
 * - داده‌های excel-import یا هر source دیگری را دست نمی‌زند.
 * - برای چند هفته داده می‌سازد تا نمودارهای روزانه/اشخاص/دپارتمان‌ها معنی‌دار شوند.
 * - سناریوهای عادی، تأخیر، خروج زودهنگام، ثبت ناقص، چند تردد در روز و روز بدون تردد دارد.
 *
 * اجرا:
 *   npx tsx prisma/seed.attendance-demo.ts
 *
 * اختیاری:
 *   ATTENDANCE_SEED_DAYS=60 npx tsx prisma/seed.attendance-demo.ts
 *   ATTENDANCE_SEED_END_DATE=2026-09-18 npx tsx prisma/seed.attendance-demo.ts
 */

type MockEvent = {
  userId: string;
  date: Date;
  checkTime: Date;
  source: string;
};

type DayScenario = 'NORMAL' | 'LATE' | 'EARLY' | 'LATE_EARLY' | 'INCOMPLETE' | 'MULTI_EVENT';

// PRNG قطعی تا در هر اجرا الگوی مشابه و قابل تست داشته باشیم.
function createRng(seed = 20260918) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = createRng();

function randomInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function utcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return utcDay(copy);
}

function atUtcTime(date: Date, hour: number, minute: number) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hour,
    minute,
    0,
    0,
  ));
}

function parseEndDate() {
  const raw = process.env.ATTENDANCE_SEED_END_DATE?.trim();
  if (!raw) return utcDay(new Date());

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    throw new Error('ATTENDANCE_SEED_END_DATE must be YYYY-MM-DD');
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function chooseScenario(userIndex: number, dayIndex: number): DayScenario {
  // چند الگوی ثابت باعث می‌شوند نمودار و فیلترها همیشه تنوع قابل مشاهده داشته باشند.
  const marker = (userIndex * 17 + dayIndex * 11) % 100;

  if (marker < 7) return 'INCOMPLETE';
  if (marker < 17) return 'LATE';
  if (marker < 25) return 'EARLY';
  if (marker < 30) return 'LATE_EARLY';
  if (marker < 42) return 'MULTI_EVENT';
  return 'NORMAL';
}

function buildEventsForDay(
  userId: string,
  date: Date,
  scenario: DayScenario,
): MockEvent[] {
  let inHour = 8;
  let inMinute = randomInt(0, 24);
  let outHour = 16;
  let outMinute = randomInt(10, 55);

  switch (scenario) {
    case 'LATE':
      inHour = randomInt(8, 9);
      inMinute = inHour === 8 ? randomInt(35, 59) : randomInt(0, 25);
      outHour = 17;
      outMinute = randomInt(0, 35);
      break;

    case 'EARLY':
      inHour = 8;
      inMinute = randomInt(0, 24);
      outHour = randomInt(14, 15);
      outMinute = outHour === 15 ? randomInt(0, 50) : randomInt(20, 59);
      break;

    case 'LATE_EARLY':
      inHour = 9;
      inMinute = randomInt(0, 20);
      outHour = 15;
      outMinute = randomInt(0, 45);
      break;

    case 'INCOMPLETE': {
      // بعضی روزها فقط ورود و بعضی روزها فقط یک تردد عصر داریم.
      const onlyCheck = rng() < 0.75
        ? atUtcTime(date, 8, randomInt(0, 45))
        : atUtcTime(date, 15, randomInt(20, 59));

      return [{ userId, date, checkTime: onlyCheck, source: SOURCE }];
    }

    case 'MULTI_EVENT': {
      const firstIn = atUtcTime(date, 8, randomInt(0, 24));
      const lunchOut = atUtcTime(date, 12, randomInt(0, 20));
      const lunchIn = atUtcTime(date, 13, randomInt(0, 20));
      const finalOut = atUtcTime(date, 16, randomInt(20, 59));

      return [firstIn, lunchOut, lunchIn, finalOut].map((checkTime) => ({
        userId,
        date,
        checkTime,
        source: SOURCE,
      }));
    }

    case 'NORMAL':
    default:
      break;
  }

  return [
    atUtcTime(date, inHour, inMinute),
    atUtcTime(date, outHour, outMinute),
  ].map((checkTime) => ({
    userId,
    date,
    checkTime,
    source: SOURCE,
  }));
}

async function main() {
  const requestedDays = Number(process.env.ATTENDANCE_SEED_DAYS ?? DEFAULT_DAYS);
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.trunc(requestedDays), 7), 180)
    : DEFAULT_DAYS;

  const endDate = parseEndDate();
  const startDate = addUtcDays(endDate, -(days - 1));

  const users = await prisma.user.findMany({
    where: {
      employeeCode: { not: null },
    },
    orderBy: [
      { departmentId: 'asc' },
      { employeeCode: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      employeeCode: true,
      departmentId: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  if (users.length < 5) {
    throw new Error(
      'حداقل 5 کاربر دارای employeeCode لازم است. ابتدا seed.organization.ts یا Seed اصلی پروژه را اجرا کنید.',
    );
  }

  console.log('=====================================================');
  console.log(' Attendance Analytics Mock Seed');
  console.log('=====================================================');
  console.log(`Users found: ${users.length}`);
  console.log(`Range: ${startDate.toISOString().slice(0, 10)} -> ${endDate.toISOString().slice(0, 10)}`);

  // فقط داده‌های همین Mock Seed را پاک می‌کنیم.
  const deleted = await prisma.attendance.deleteMany({
    where: { source: SOURCE },
  });
  console.log(`Old mock attendance rows removed: ${deleted.count}`);

  const events: MockEvent[] = [];
  const scenarioCounters: Record<DayScenario | 'ABSENT', number> = {
    NORMAL: 0,
    LATE: 0,
    EARLY: 0,
    LATE_EARLY: 0,
    INCOMPLETE: 0,
    MULTI_EVENT: 0,
    ABSENT: 0,
  };

  const activeDates: Date[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = addUtcDays(startDate, offset);

    // جمعه را به عنوان روز تعطیل Seed در نظر می‌گیریم.
    if (date.getUTCDay() === 5) continue;
    activeDates.push(date);
  }

  users.forEach((user, userIndex) => {
    activeDates.forEach((date, dayIndex) => {
      // حدود 6 درصد روزها بدون هیچ ترددی هستند تا فاصله‌های واقعی در داده دیده شوند.
      // این رکورد در UI «غیبت قطعی» نامیده نمی‌شود، چون سیستم هنوز Shift/Leave ندارد.
      const absenceMarker = (userIndex * 13 + dayIndex * 19) % 100;
      if (absenceMarker < 6) {
        scenarioCounters.ABSENT += 1;
        return;
      }

      const scenario = chooseScenario(userIndex, dayIndex);
      scenarioCounters[scenario] += 1;
      events.push(...buildEventsForDay(user.id, date, scenario));
    });
  });

  // یک روز اخیر با داده بسیار متنوع برای تست سریع UI تضمین می‌کنیم.
  const latestWorkingDay = [...activeDates].reverse().find((d) => d <= endDate);
  if (latestWorkingDay) {
    const forcedUsers = users.slice(0, Math.min(users.length, 6));
    const forcedScenarios: DayScenario[] = [
      'NORMAL',
      'LATE',
      'EARLY',
      'INCOMPLETE',
      'MULTI_EVENT',
      'LATE_EARLY',
    ];

    // رکوردهای mock همین افراد/روز را از آرایه حذف و الگوی مشخص جایگزین می‌کنیم.
    for (let i = 0; i < forcedUsers.length; i += 1) {
      const user = forcedUsers[i];
      for (let x = events.length - 1; x >= 0; x -= 1) {
        if (
          events[x].userId === user.id &&
          events[x].date.getTime() === latestWorkingDay.getTime()
        ) {
          events.splice(x, 1);
        }
      }
      events.push(...buildEventsForDay(user.id, latestWorkingDay, forcedScenarios[i]));
    }
  }

  const created = await prisma.attendance.createMany({
    data: events,
    skipDuplicates: true,
  });

  const departments = new Set(users.map((u) => u.departmentId));
  const uniqueDays = new Set(events.map((e) => e.date.toISOString().slice(0, 10)));

  console.log('-----------------------------------------------------');
  console.log(`Departments represented: ${departments.size}`);
  console.log(`Working days represented: ${uniqueDays.size}`);
  console.log(`Attendance events created: ${created.count}`);
  console.log('Scenario day counts (before forced demo-day replacement):');
  console.table(scenarioCounters);

  console.log('\nSample employees by department:');
  const sampleByDepartment = new Map<string, string[]>();
  for (const user of users) {
    const key = user.department.name;
    const names = sampleByDepartment.get(key) ?? [];
    if (names.length < 3) names.push(`${user.name} (${user.employeeCode})`);
    sampleByDepartment.set(key, names);
  }
  for (const [department, names] of sampleByDepartment.entries()) {
    console.log(`- ${department}: ${names.join('، ')}`);
  }

  console.log('\nDone. Open /dashboard/attendance/list and test:');
  console.log('- date range filtering');
  console.log('- person search');
  console.log('- department filtering');
  console.log('- records / people / departments tabs');
  console.log('- trend, department and issues charts');
  console.log('- CSV export');
  console.log('=====================================================');
}

main()
  .catch((error) => {
    console.error('Attendance mock seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
