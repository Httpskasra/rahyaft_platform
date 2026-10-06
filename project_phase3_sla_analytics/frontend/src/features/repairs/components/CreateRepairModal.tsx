/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Phone, Plus, User, UserPlus } from "lucide-react";
import { repairsApi, type RepairType } from "@/lib/api/repairs";
import type { Customer } from "@/lib/api/customers";
import { CustomerPickerModal } from "@/components/repairs/CustomerPickerModal";
import {
  LabeledInput as InputField,
  LabeledSelect as SelectField,
} from "@/components/ui/FormControls";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { ToastType } from "@/hooks/useToast";

export function CreateRepairModal({
  open,
  onClose,
  onCreate,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  showToast: (type: ToastType, message: string) => void;
}) {
  const [form, setForm] = useState({
    deviceTitle: "",
    serialNumber: "",
    problemDescription: "",
    type: "" as RepairType | "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      deviceTitle: "",
      serialNumber: "",
      problemDescription: "",
      type: "",
    });
    setSelectedCustomer(null);
  }, [open]);

  const handleSubmit = async () => {
    if (
      !selectedCustomer ||
      !form.deviceTitle ||
      !form.problemDescription ||
      !form.type
    ) {
      showToast("error", "لطفاً تمام فیلدهای الزامی را پر کنید");
      return;
    }
    setCreating(true);
    try {
      await repairsApi.create({
        customerId: selectedCustomer.id,
        deviceTitle: form.deviceTitle,
        serialNumber: form.serialNumber || undefined,
        problemDescription: form.problemDescription,
        type: form.type,
      });
      showToast("success", "پرونده تعمیر ایجاد شد");
      onCreate();
      onClose();
    } catch {
      showToast("error", "خطا در ایجاد پرونده تعمیر");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="پرونده تعمیر جدید"
        subtitle="اطلاعات دستگاه و مشکل را وارد کنید">
        <div className="space-y-4">
          {/* Customer selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              مشتری<span className="mr-0.5 text-red-500">*</span>
            </label>

            {selectedCustomer ?
              <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-800 dark:bg-brand-500/10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-gray-800">
                  <User
                    size={15}
                    className="text-brand-600 dark:text-brand-400"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span dir="ltr" className="flex items-center gap-1">
                      <Phone size={11} />
                      {selectedCustomer.mobile}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-500/20">
                  تغییر
                </button>
              </div>
            : <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 text-sm font-medium text-gray-500 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-400 dark:hover:border-brand-700 dark:hover:text-brand-400 transition-colors">
                <UserPlus size={14} />
                انتخاب یا ساخت مشتری
              </button>
            }
          </div>

          <InputField
            label="عنوان دستگاه"
            value={form.deviceTitle}
            onChange={(v) => setForm((f) => ({ ...f, deviceTitle: v }))}
            placeholder="مثلاً: لپ‌تاپ Dell XPS 15"
            required
          />
          <InputField
            label="شماره سریال"
            value={form.serialNumber}
            onChange={(v) => setForm((f) => ({ ...f, serialNumber: v }))}
            placeholder="اختیاری"
            ltr
          />
          <SelectField
            label="نوع تعمیر"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v as RepairType }))}
            options={[
              { value: "IN_HOUSE", label: "درون‌سازمانی" },
              { value: "ON_SITE", label: "در محل" },
            ]}
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              شرح مشکل<span className="text-red-500 mr-0.5">*</span>
            </label>
            <textarea
              value={form.problemDescription}
              onChange={(e) =>
                setForm((f) => ({ ...f, problemDescription: e.target.value }))
              }
              rows={3}
              placeholder="مشکل دستگاه را شرح دهید..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder-gray-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              انصراف
            </button>
            <button
              onClick={handleSubmit}
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {creating ?
                <Spinner size={13} />
              : <Plus size={14} />}
              ایجاد پرونده
            </button>
          </div>
        </div>
      </Modal>

      <CustomerPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => setSelectedCustomer(c)}
      />
    </>
  );
}
// ─── Main Page ────────────────────────────────────────────────
