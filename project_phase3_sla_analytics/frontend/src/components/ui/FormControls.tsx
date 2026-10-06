import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

const controlClassName =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90";

interface FieldLabelProps {
  label: string;
  required?: boolean;
}

function FieldLabel({ label, required }: FieldLabelProps) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {label}
      {required && <span className="mr-0.5 text-red-500">*</span>}
    </label>
  );
}

interface LabeledInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange">,
    FieldLabelProps {
  onChange: (value: string) => void;
  ltr?: boolean;
}

export function LabeledInput({
  label,
  required,
  onChange,
  ltr,
  className = "",
  ...props
}: LabeledInputProps) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        {...props}
        dir={ltr ? "ltr" : "rtl"}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClassName} placeholder-gray-400 dark:placeholder-gray-500 ${className}`}
      />
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

interface LabeledSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange">,
    FieldLabelProps {
  onChange: (value: string) => void;
  options: SelectOption[];
  emptyLabel?: string;
}

export function LabeledSelect({
  label,
  required,
  onChange,
  options,
  emptyLabel = "-- انتخاب کنید --",
  className = "",
  ...props
}: LabeledSelectProps) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <select
        {...props}
        onChange={(event) => onChange(event.target.value)}
        className={`${controlClassName} appearance-none ${className}`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
