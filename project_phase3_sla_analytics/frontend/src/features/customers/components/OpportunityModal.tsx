"use client";

import { useState } from "react";
import { customersApi, type OpportunityPayload } from "@/lib/api/customers";
import { PersianDatePicker } from "@/components/ui/PersianDatePicker";
import { input } from "../constants";
import { Field, Input, SimpleModal } from "./ModalPrimitives";

export function OpportunityModal({
  open,
  customerId,
  close,
  done,
}: {
  open: boolean;
  customerId: string;
  close: () => void;
  done: () => void;
}) {
  const [f, setF] = useState<OpportunityPayload>({
    title: "",
    status: "NEW",
    priority: "MEDIUM",
    probability: 0,
  });
  return (
    <SimpleModal
      open={open}
      title="فرصت فروش جدید"
      close={close}
      save={async () => {
        await customersApi.createOpportunity(customerId, f);
        setF({ title: "", status: "NEW", priority: "MEDIUM", probability: 0 });
        done();
      }}>
      <Input
        label="عنوان"
        value={f.title}
        set={(v) => setF({ ...f, title: v })}
      />
      <Field label="وضعیت فرصت فروش">
        <select
          value={f.status || "NEW"}
          onChange={(e) => setF({ ...f, status: e.target.value as OpportunityPayload["status"] })}
          className={input}>
          <option value="NEW">جدید</option>
          <option value="CONTACTED">تماس گرفته‌شده</option>
          <option value="NEEDS_QUOTE">نیازمند پیش‌فاکتور</option>
          <option value="QUOTED">پیش‌فاکتور ارسال‌شده</option>
          <option value="NEGOTIATION">مذاکره</option>
          <option value="WON">موفق</option>
          <option value="LOST">از دست رفته</option>
          <option value="CANCELED">لغو شده</option>
        </select>
      </Field>
      <Field label="اولویت">
        <select
          value={f.priority || "MEDIUM"}
          onChange={(e) => setF({ ...f, priority: e.target.value as OpportunityPayload["priority"] })}
          className={input}>
          <option value="LOW">کم</option>
          <option value="MEDIUM">متوسط</option>
          <option value="HIGH">زیاد</option>
          <option value="URGENT">فوری</option>
        </select>
      </Field>
      <Input
        label="مبلغ تخمینی"
        value={f.estimatedValue?.toString()}
        set={(v) => setF({ ...f, estimatedValue: Number(v) })}
      />
      <Input
        label="احتمال فروش (۰ تا ۱۰۰)"
        value={f.probability?.toString()}
        set={(v) => setF({ ...f, probability: Number(v) })}
      />
      <Field label="تاریخ احتمالی نهایی‌شدن فروش">
        <PersianDatePicker
          value={f.expectedCloseAt}
          valueMode="iso"
          onChange={(v) => setF({ ...f, expectedCloseAt: v || undefined })}
          placeholder="انتخاب تاریخ نهایی‌شدن"
          className={input}
        />
      </Field>
      <Field label="تاریخ پیگیری بعدی">
        <PersianDatePicker
          value={f.nextFollowUpAt}
          valueMode="iso"
          withTime
          onChange={(v) => setF({ ...f, nextFollowUpAt: v || undefined })}
          placeholder="انتخاب تاریخ و ساعت پیگیری"
          className={input}
        />
      </Field>
    </SimpleModal>
  );
}
