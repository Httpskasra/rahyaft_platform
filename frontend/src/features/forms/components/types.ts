export type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "table"
  | "jalali_date";

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  columns?: import("@/lib/api/forms").TableColumn[];
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "متن کوتاه",
  number: "عدد",
  textarea: "متن بلند",
  select: "لیست کشویی",
  radio: "انتخاب تکی (Radio)",
  checkbox: "چک‌باکس (چندگانه)",
  table: "جدول داینامیک",
  jalali_date: "تاریخ شمسی 📅",
};

export const OPTION_TYPES: FieldType[] = ["select", "radio", "checkbox"];
