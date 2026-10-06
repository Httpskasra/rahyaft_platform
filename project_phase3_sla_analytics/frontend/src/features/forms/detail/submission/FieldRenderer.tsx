import { cn } from "@/lib/cn";
import type { SchemaField } from "../types";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { TableRenderer } from "./TableRenderer";

export function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const base =
    "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const opts =
    Array.isArray(field.options) ? field.options.filter(Boolean) : [];
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label}
        {field.required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-gray-400">{field.description}</p>
      )}
      {field.type === "table" && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
            {field.required && <span className="text-red-500 mr-1">*</span>}
          </label>
          {field.description && (
            <p className="text-xs text-gray-400">{field.description}</p>
          )}
          <TableRenderer
            columns={field.columns ?? []}
            value={value as Record<string, unknown>[] | undefined}
            onChange={(rows) => onChange(rows)}
          />
        </div>
      )}
      {field.type === "textarea" && (
        <textarea
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(base, "resize-none")}
        />
      )}
      {field.type === "select" && (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={base}>
          <option value="">-- انتخاب کنید --</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      {field.type === "radio" && (
        <div className="flex flex-col gap-2 mt-1">
          {opts.map((o) => (
            <label
              key={o}
              className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name={field.id}
                value={o}
                checked={(value as string) === o}
                onChange={() => onChange(o)}
                className="accent-blue-600"
              />
              {o}
            </label>
          ))}
        </div>
      )}
      {field.type === "checkbox" && opts.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {opts.map((o) => {
            const sel = Array.isArray(value) ? (value as string[]) : [];
            return (
              <label
                key={o}
                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={sel.includes(o)}
                  onChange={() =>
                    onChange(
                      sel.includes(o) ?
                        sel.filter((s) => s !== o)
                      : [...sel, o],
                    )
                  }
                  className="rounded accent-blue-600"
                />
                {o}
              </label>
            );
          })}
        </div>
      )}
      {field.type === "jalali_date" && (
        <JalaliDatePicker
          value={(value as string) ?? ""}
          onChange={onChange}
          // required={field.required}
        />
      )}
      {field.type === "checkbox" && opts.length === 0 && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 mt-1">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded accent-blue-600"
          />
          {field.label}
        </label>
      )}
      {![
        "textarea",
        "select",
        "radio",
        "checkbox",
        "table",
        "jalali_date",
      ].includes(field.type) && (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={(value as string) ?? ""}
          onChange={(e) =>
            onChange(
              field.type === "number" ? Number(e.target.value) : e.target.value,
            )
          }
          className={base}
        />
      )}
    </div>
  );
}


