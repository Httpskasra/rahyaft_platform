"use client";

import { useId, type ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import type { ToastType } from "@/hooks/useToast";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function RepairStatusDetails({
  reason,
  onReasonChange,
  image,
  onImageChange,
  showToast,
  disabled = false,
}: {
  reason: string;
  onReasonChange: (reason: string) => void;
  image: File | null;
  onImageChange: (image: File | null) => void;
  showToast: (type: ToastType, message: string) => void;
  disabled?: boolean;
}) {
  const inputId = useId();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast("error", "فرمت تصویر باید JPG، PNG یا WebP باشد");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      showToast("error", "حجم تصویر نباید بیشتر از ۵ مگابایت باشد");
      return;
    }

    onImageChange(file);
  };

  return (
    <div className="space-y-3 pt-1">
      <textarea
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        rows={3}
        maxLength={2000}
        disabled={disabled}
        placeholder="توضیحات این مرحله (اختیاری)"
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
      />

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}>
          <ImagePlus size={14} />
          افزودن تصویر مرحله
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          disabled={disabled}
          className="sr-only"
        />
        {image && (
          <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <span className="max-w-48 truncate">{image.name}</span>
            <button
              type="button"
              onClick={() => onImageChange(null)}
              disabled={disabled}
              aria-label="حذف تصویر انتخاب‌شده"
              className="text-gray-500 hover:text-red-500 disabled:opacity-50">
              <X size={13} />
            </button>
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        تصویر JPG، PNG یا WebP تا حداکثر ۵ مگابایت
      </p>
    </div>
  );
}
