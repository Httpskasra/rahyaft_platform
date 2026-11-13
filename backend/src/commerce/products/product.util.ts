export interface ProductNameParts {
  nameGroup?: string | null;
  nameType?: string | null;
  nameDefinition?: string | null;
  brand?: string | null;
  model?: string | null;
  grade?: string | null;
  extraCode?: string | null;
  color?: string | null;
}

/**
 * ترتیب ستون‌ها در نام کلی (مطابق جدول نام‌گذاری، از راست به چپ).
 * برای تغییر ترتیب فقط همین آرایه را عوض کنید.
 */
export const NAME_PART_ORDER: (keyof ProductNameParts)[] = [
  'nameGroup',
  'nameType',
  'nameDefinition',
  'brand',
  'model',
  'grade',
  'extraCode',
  'color',
];

/** نام کلی = الحاق ستون‌های پر‌شده با فاصله */
export function buildFullName(parts: ProductNameParts): string {
  return NAME_PART_ORDER.map((k) => parts[k]?.toString().trim())
    .filter((v): v is string => !!v)
    .join(' ');
}

/** کد کالا ۹ رقمی: [نوع ۲][کتگوری ۳][شماره ۴] */
export function buildProductCode(
  typeCode: string,
  categoryCode: string,
  itemCode: string,
): string {
  return `${typeCode}${categoryCode}${itemCode}`;
}

export const pad = (n: number, len: number) => String(n).padStart(len, '0');
