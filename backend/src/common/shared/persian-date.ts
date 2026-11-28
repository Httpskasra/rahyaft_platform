/** Persian (Jalali) year of a date — used for human-readable document numbers. */
export function persianYear(date: Date = new Date()): number {
  const text = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric' }).format(date);
  return parseInt(text, 10);
}

/** Formats a date as Jalali yyyy/MM/dd (Latin digits). */
export function formatPersianDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year').replace(/\D/g, '')}/${get('month')}/${get('day')}`;
}

export function formatPersianDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${formatPersianDate(d)} ${time}`;
}
