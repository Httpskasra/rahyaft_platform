"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

interface DetailInfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
  copyable?: boolean;
}

export function DetailInfoRow({
  icon,
  label,
  value,
  ltr,
  copyable,
}: DetailInfoRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p
          className="mt-0.5 truncate text-sm font-semibold text-gray-800 dark:text-white/90"
          dir={ltr ? "ltr" : "rtl"}
        >
          {value || "—"}
        </p>
      </div>
      {copyable && value && (
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}
