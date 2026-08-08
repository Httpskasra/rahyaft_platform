import { Plus, Trash2 } from "lucide-react";

export function TableRenderer({
  columns,
  value,
  onChange,
}: {
  columns: {
    id: string;
    label: string;
    type: string;
    options?: string[];
  }[];
  value: Record<string, unknown>[] | undefined;
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const rows = value ?? [];

  const addRow = () => {
    const newRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      if (col.type === "number") newRow[col.id] = "";
      else if (col.type === "select" && col.options?.length)
        newRow[col.id] = col.options[0];
      else newRow[col.id] = "";
    });
    onChange([...rows, newRow]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIdx: number, colId: string, val: unknown) => {
    const updated = rows.map((row, i) => {
      if (i !== rowIdx) return row;
      return { ...row, [colId]: val };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto border rounded-xl dark:border-gray-700">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-2 py-1.5 font-medium text-gray-700 dark:text-gray-300 text-right whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="w-10" /> {/* دکمه حذف */}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-t border-gray-100 dark:border-gray-800">
                {columns.map((col) => {
                  const val = row[col.id];
                  if (col.type === "select" && col.options?.length) {
                    return (
                      <td key={col.id} className="px-2 py-1">
                        <select
                          value={(val as string) ?? ""}
                          onChange={(e) =>
                            updateCell(rowIdx, col.id, e.target.value)
                          }
                          className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">--</option>
                          {col.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }
                  if (col.type === "number") {
                    return (
                      <td key={col.id} className="px-2 py-1">
                        <input
                          type="number"
                          value={(val as string) ?? ""}
                          onChange={(e) =>
                            updateCell(rowIdx, col.id, e.target.value)
                          }
                          className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={col.id} className="px-2 py-1">
                      <input
                        type="text"
                        value={(val as string) ?? ""}
                        onChange={(e) =>
                          updateCell(rowIdx, col.id, e.target.value)
                        }
                        className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => removeRow(rowIdx)}
                    className="text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
        <Plus size={12} /> افزودن ردیف
      </button>
    </div>
  );
}

