import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PERIOD_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})\s*~\s*(\d{2})\/(\d{2})\/(\d{4})$/;

const HEADER_ROW_INDEX = 1; // ردیف "دوره:"
const DAY_NUMBER_ROW_INDEX = 2; // ردیف "تعداد" | "نام" | 1 | 2 | ...
const FIRST_DATA_ROW_INDEX = 4; // اولین ردیف کاربر
const EMPLOYEE_CODE_COL = 0;
const FIRST_DAY_COL = 2;

export interface ParsedAttendanceEntry {
  employeeCode: string;
  date: Date; // تاریخ روز (بدون زمان، UTC midnight)
  checkTime: Date; // تاریخ + ساعت دقیق
}

export interface ParsedAttendanceSheet {
  periodStart: Date;
  entries: ParsedAttendanceEntry[];
}

/**
 * پارس فایل اکسل تردد (xls/xlsx) به لیست تردد‌های خام.
 * فایل صرفاً در حافظه پردازش می‌شود و در هیچ جا ذخیره نمی‌گردد.
 */
export function parseAttendanceWorkbook(buffer: Buffer): ParsedAttendanceSheet {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new BadRequestException('Workbook has no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: null,
  });

  const periodStart = extractPeriodStart(rows);
  const dayColumnMap = buildDayColumnMap(rows);
  const entries: ParsedAttendanceEntry[] = [];

  for (let r = FIRST_DATA_ROW_INDEX; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const rawCode = row[EMPLOYEE_CODE_COL];
    const employeeCode = normalizeEmployeeCode(rawCode);
    if (employeeCode === null) continue; // ردیف بدون کد پرسنلی معتبر -> رد شود

    for (const [colIndex, dayNumber] of dayColumnMap.entries()) {
      const cellValue = row[colIndex];
      if (!cellValue) continue;

      const date = addDays(periodStart, dayNumber - 1);
      const times = extractTimes(String(cellValue));

      for (const time of times) {
        const checkTime = combineDateAndTime(date, time);
        entries.push({ employeeCode, date, checkTime });
      }
    }
  }

  return { periodStart, entries };
}

/** استخراج تاریخ شروع دوره از ردیف "دوره: 01/02/2026 ~ 28/02/2026" */
function extractPeriodStart(rows: unknown[][]): Date {
  const headerRow = rows[HEADER_ROW_INDEX] ?? [];
  for (const cell of headerRow) {
    if (typeof cell !== 'string') continue;
    const match = PERIOD_REGEX.exec(cell.trim());
    if (match) {
      const [, day, month, year] = match;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
  }
  throw new BadRequestException(
    'Could not find a valid period header (e.g. "01/02/2026 ~ 28/02/2026")',
  );
}

/**
 * نگاشت ستون -> شماره روز ماه، بر اساس ردیف سوم (شامل اعداد 1..N).
 * ستون‌های شامل برچسب روز هفته ("ش", "1ش", ...) شماره روز ندارند و نادیده گرفته می‌شوند.
 */
function buildDayColumnMap(rows: unknown[][]): Map<number, number> {
  const dayRow = rows[DAY_NUMBER_ROW_INDEX] ?? [];
  const map = new Map<number, number>();

  for (let c = FIRST_DAY_COL; c < dayRow.length; c++) {
    const value = dayRow[c];
    const dayNumber = toDayNumber(value);
    if (dayNumber !== null) {
      map.set(c, dayNumber);
    }
  }

  if (map.size === 0) {
    throw new BadRequestException(
      'Could not find day-number columns in the day header row',
    );
  }

  return map;
}

function toDayNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 31) return null;
  return n;
}

function normalizeEmployeeCode(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === '') return null;
  return str;
}

/** استخراج تمام مقادیر HH:MM معتبر از یک سلول چندخطی */
function extractTimes(cellValue: string): { hours: number; minutes: number }[] {
  return cellValue
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => TIME_REGEX.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({
      hours: Number(match[1]),
      minutes: Number(match[2]),
    }));
}

function combineDateAndTime(
  date: Date,
  time: { hours: number; minutes: number },
): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      time.hours,
      time.minutes,
      0,
    ),
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
