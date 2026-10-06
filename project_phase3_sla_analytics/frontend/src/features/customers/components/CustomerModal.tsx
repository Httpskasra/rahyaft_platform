/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-expressions */
"use client";

import { useEffect, useState } from "react";
import {
  customersApi, type Customer, type CustomerPayload,
} from "@/lib/api/customers";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import { Modal } from "@/components/ui/Modal";
import { input, occupationGroupOptions } from "../constants";
import { Actions, Field, Input } from "./ModalPrimitives";

export function CustomerModal({
  open,
  customer,
  close,
  done,
}: {
  open: boolean;
  customer: Customer | null;
  close: () => void;
  done: () => void;
}) {
  const [form, setForm] = useState<CustomerPayload>({
      type: "PERSON",
      status: "ACTIVE",
    }),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm(customer ? { ...customer } : { type: "PERSON", status: "ACTIVE" });
  }, [customer, open]);
  const set = (k: string, v: any) =>
    setForm((p) => ({ ...p, [k]: v || undefined }));
  const save = async () => {
    setSaving(true);
    try {
      customer ?
        await customersApi.update(customer.id, form)
      : await customersApi.create(form);
      done();
    } catch {
      alert("اطلاعات فرم یا مقادیر یکتا را بررسی کنید");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title={customer ? "ویرایش مشتری" : "ثبت مشتری جدید"}
      maxWidth="max-w-3xl"
      bodyClassName="max-h-[75vh] overflow-y-auto">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="نوع مشتری">
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className={input}>
            <option value="PERSON">حقیقی</option>
            <option value="ORGANIZATION">سازمانی</option>
          </select>
        </Field>
        <Field label="وضعیت">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={input}>
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
            <option value="BLACKLISTED">مسدود</option>
          </select>
        </Field>
        {form.type === "PERSON" ?
          <>
            <Input
              label="نام"
              value={form.firstName}
              set={(v) => set("firstName", v)}
            />
            <Input
              label="نام خانوادگی"
              value={form.lastName}
              set={(v) => set("lastName", v)}
            />
            <Input
              label="کد ملی"
              value={form.nationalCode}
              set={(v) => set("nationalCode", v)}
            />
            <Field label="تاریخ تولد">
              <PersianDatePicker
                value={form.birthDate}
                valueMode="jalali"
                onChange={(v) => set("birthDate", v)}
                placeholder="انتخاب تاریخ تولد"
                className={input}
              />
            </Field>
            <Field label="جنسیت">
              <select
                value={form.gender || ""}
                onChange={(e) => set("gender", e.target.value)}
                className={input}>
                <option value="">انتخاب کنید</option>
                <option value="MALE">مرد</option>
                <option value="FEMALE">زن</option>
              </select>
            </Field>
          </>
        : <>
            <Input
              label="نام سازمان/کلینیک"
              value={form.organizationName}
              set={(v) => set("organizationName", v)}
            />
            <Input
              label="شناسه ملی"
              value={form.nationalId}
              set={(v) => set("nationalId", v)}
            />
            <Input
              label="کد اقتصادی"
              value={form.economicCode}
              set={(v) => set("economicCode", v)}
            />
            <Input
              label="شماره ثبت"
              value={form.registrationNo}
              set={(v) => set("registrationNo", v)}
            />
          </>
        }
        <Input
          label="موبایل"
          value={form.mobile}
          set={(v) => set("mobile", v)}
        />
        <Input label="تلفن" value={form.phone} set={(v) => set("phone", v)} />
        <Input label="ایمیل" value={form.email} set={(v) => set("email", v)} />
        <Input
          label="استان"
          value={form.province}
          set={(v) => set("province", v)}
        />
        <Input label="شهر" value={form.city} set={(v) => set("city", v)} />
        <Input
          label="عنوان شغل / حوزه فعالیت"
          value={form.occupation}
          set={(v) => set("occupation", v)}
        />
        <Field label="گروه شغلی">
          <select
            value={form.occupationGroup || ""}
            onChange={(e) => set("occupationGroup", e.target.value)}
            className={input}>
            <option value="">انتخاب کنید</option>
            {occupationGroupOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Input
            label="آدرس"
            value={form.address}
            set={(v) => set("address", v)}
          />
        </div>
      </div>
      <Actions close={close} save={save} saving={saving} />
    </Modal>
  );
}
