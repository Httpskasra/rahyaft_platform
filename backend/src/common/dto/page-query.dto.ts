import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

/** Boolean query-string flag ("true"/"false") */
export function BoolQuery() {
  return function (target: object, key: string) {
    Transform(({ value }) => (value === undefined || value === '' ? undefined : value === true || value === 'true'))(target, key);
    IsOptional()(target, key);
    IsBoolean()(target, key);
  };
}

/**
 * Same contract as the repairs list:
 *  - `search`: multi-word; EVERY word must match in at least one of the searchable fields (incl. related records)
 *  - `from` / `to`: inclusive date range on the list's main date (the end day is included)
 *  - response: { items, meta: { total, page, pageSize, totalPages } }
 */
export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;

  @ApiPropertyOptional({ description: 'جستجوی چندکلمه‌ای (همه کلمات باید در فیلدهای قابل‌جستجو پیدا شوند)' })
  @IsOptional() @IsString() @MaxLength(100) search?: string;

  /** @deprecated use `search` */
  @ApiPropertyOptional({ description: 'مترادف search (قدیمی)' }) @IsOptional() @IsString() @MaxLength(100) q?: string;

  @ApiPropertyOptional({ description: 'از تاریخ (ISO)' }) @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ description: 'تا تاریخ (ISO) — روز پایان هم شامل می‌شود' }) @IsOptional() @IsDateString() to?: string;

  @ApiPropertyOptional({ description: 'ستون مرتب‌سازی (بسته به لیست)' }) @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() @IsIn(['asc', 'desc']) sortDir?: 'asc' | 'desc';
}

export function pageArgs(q: { page?: number; limit?: number }) {
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function paged<T>(items: T[], total: number, q: { page?: number; limit?: number }, extra: Record<string, unknown> = {}) {
  const { page, limit } = pageArgs(q);
  return { items, meta: { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) }, ...extra };
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ───────── search helpers ─────────
export function searchTerms(q: { search?: string; q?: string }): string[] {
  return (q.search ?? q.q)?.trim().split(/\s+/).filter(Boolean) ?? [];
}

/** AND over words; each word is an OR over the field conditions produced by `fields(term)`. */
export function termConditions(terms: string[], fields: (term: string) => any[]): any[] {
  return terms.map((t) => ({ OR: fields(t) }));
}

export const ci = (term: string) => ({ contains: term, mode: 'insensitive' as const });

/** Inclusive date range (same validation and messages as the repairs module). */
export function dateRange(field: string, from?: string, to?: string): any | null {
  if (!from && !to) return null;
  const range: { gte?: Date; lt?: Date } = {};
  if (from) {
    const d = new Date(from);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('تاریخ شروع معتبر نیست');
    range.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('تاریخ پایان معتبر نیست');
    range.lt = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  }
  if (range.gte && range.lt && range.gte >= range.lt) throw new BadRequestException('بازه تاریخ معتبر نیست');
  return { [field]: range };
}

/** whitelist-based ordering: `allowed` maps public sortBy names to a prisma orderBy builder. */
export function orderByOf(
  q: { sortBy?: string; sortDir?: 'asc' | 'desc' },
  allowed: Record<string, (dir: 'asc' | 'desc') => any>,
  fallback: any[],
): any[] {
  const build = q.sortBy ? allowed[q.sortBy] : undefined;
  return build ? [build(q.sortDir ?? 'desc'), { id: 'desc' }] : fallback;
}

export const productSearch = (t: string, prefix = '') => {
  const p = (o: any) => (prefix ? { [prefix]: { is: o } } : o);
  return [
    p({ fullName: ci(t) }), p({ code: { contains: t } }), p({ brand: ci(t) }), p({ model: ci(t) }),
    p({ color: ci(t) }), p({ grade: ci(t) }), p({ definitionSuffix: ci(t) }),
  ];
};

export const supplierSearch = (t: string) => [
  { firstName: ci(t) }, { lastName: ci(t) }, { companyName: ci(t) }, { representativeName: ci(t) },
  { accountantName: ci(t) }, { phone: { contains: t } }, { representativePhone: { contains: t } },
  { accountantPhone: { contains: t } },
];

export const customerSearch = (t: string) => [
  { firstName: ci(t) }, { lastName: ci(t) }, { organizationName: ci(t) }, { mobile: { contains: t } }, { phone: { contains: t } },
];
