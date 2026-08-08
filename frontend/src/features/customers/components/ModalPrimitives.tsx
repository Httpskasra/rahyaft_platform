import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { input } from "../constants";

export function SimpleModal({
  open,
  title,
  close,
  save,
  children,
}: {
  open: boolean;
  title: string;
  close: () => void;
  save: () => Promise<void>;
  children: any;
}) {
  const [saving, setSaving] = useState(false);
  return (
    <Modal open={open} onClose={close} title={title} maxWidth="max-w-lg">
      <div className="space-y-4">{children}</div>
      <Actions
        close={close}
        save={async () => {
          setSaving(true);
          try {
            await save();
          } catch {
            alert("ثبت اطلاعات ناموفق بود");
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
      />
    </Modal>
  );
}
export function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-gray-600 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}
export function Input({
  label,
  value,
  set,
  type = "text",
}: {
  label: string;
  value?: any;
  set: (v: string) => void;
  type?: string;
}) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => set(e.target.value)}
        className={input}
      />
    </Field>
  );
}
export function Actions({
  close,
  save,
  saving,
}: {
  close: () => void;
  save: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button onClick={close} className="rounded-xl border px-4 py-2 text-sm">
        انصراف
      </button>
      <button
        disabled={saving}
        onClick={save}
        className="rounded-xl bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50">
        {saving ? "در حال ذخیره..." : "ذخیره"}
      </button>
    </div>
  );
}
