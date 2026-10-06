import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

export function JalaliDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DatePicker
      calendar={persian}
      locale={persian_fa}
      value={value || null}
onChange={(date) => {
  if (!date) {
    onChange("");
    return;
  }

  const formatted = date.format("YYYY/MM/DD");

  // مهم: نرمال‌سازی عددها
  const normalized = formatted
    .replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)])
    .replace(/-/g, "/");

  onChange(normalized);
}}
      format="YYYY/MM/DD"
      calendarPosition="bottom-right"
      inputClass="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

