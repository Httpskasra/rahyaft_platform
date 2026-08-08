"use client";

import DatePicker from "react-multi-date-picker";
import type DateObject from "react-date-object";
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";

export type PersianDateValueMode = "jalali" | "gregorian-date" | "iso";

type Props = {
  value?: string | null;
  onChange: (value: string) => void;
  valueMode?: PersianDateValueMode;
  withTime?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

const latinDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)])
    .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)]);

function pickerValue(value: string | null | undefined, mode: PersianDateValueMode) {
  if (!value) return null;

  if (mode === "jalali") return value;

  const date = mode === "gregorian-date" ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function PersianDatePicker({
  value,
  onChange,
  valueMode = "gregorian-date",
  withTime = false,
  placeholder = "انتخاب تاریخ",
  className = "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white",
  disabled = false,
}: Props) {
  const handleChange = (date: DateObject | null) => {
    if (!date) {
      onChange("");
      return;
    }

    if (valueMode === "jalali") {
      onChange(latinDigits(date.format(withTime ? "YYYY/MM/DD HH:mm" : "YYYY/MM/DD")));
      return;
    }

    if (valueMode === "iso") {
      onChange(date.toDate().toISOString());
      return;
    }

    const gregorianDate = date.convert(gregorian);
    onChange(latinDigits(gregorianDate.format("YYYY-MM-DD")));
  };

  return (
    <DatePicker
      calendar={persian}
      locale={persianFa}
      value={pickerValue(value, valueMode)}
      onChange={handleChange}
      format={withTime ? "YYYY/MM/DD HH:mm" : "YYYY/MM/DD"}
      calendarPosition="bottom-right"
      inputClass={className}
      placeholder={placeholder}
      disabled={disabled}
      editable={false}
      plugins={withTime ? [<TimePicker key="time" position="bottom" hideSeconds />] : []}
      containerClassName="w-full"
    />
  );
}
