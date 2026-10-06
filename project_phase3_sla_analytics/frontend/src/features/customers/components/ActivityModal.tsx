"use client";

import { useState } from "react";
import { customersApi, type ActivityPayload } from "@/lib/api/customers";
import { input } from "../constants";
import { Field, Input, SimpleModal } from "./ModalPrimitives";

export function ActivityModal({
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
  const [f, setF] = useState<ActivityPayload>({ type: "NOTE", title: "" });
  return (
    <SimpleModal
      open={open}
      title="ثبت فعالیت"
      close={close}
      save={async () => {
        await customersApi.createActivity(customerId, f);
        setF({ type: "NOTE", title: "" });
        done();
      }}>
      <Field label="نوع">
        <select
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value as any })}
          className={input}>
          <option value="NOTE">یادداشت</option>
          <option value="CALL">تماس</option>
          <option value="SMS">پیامک</option>
          <option value="VISIT">ملاقات</option>
          <option value="FOLLOW_UP">پیگیری</option>
        </select>
      </Field>
      <Input
        label="عنوان"
        value={f.title}
        set={(v) => setF({ ...f, title: v })}
      />
      <Input label="شرح" value={f.body} set={(v) => setF({ ...f, body: v })} />
    </SimpleModal>
  );
}
