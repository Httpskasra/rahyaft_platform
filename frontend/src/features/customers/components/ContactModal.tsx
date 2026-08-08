"use client";

import { useState } from "react";
import { customersApi, type ContactPayload } from "@/lib/api/customers";
import { Input, SimpleModal } from "./ModalPrimitives";

export function ContactModal({
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
  const [f, setF] = useState<ContactPayload>({ fullName: "" });
  return (
    <SimpleModal
      open={open}
      title="افزودن مخاطب سازمانی"
      close={close}
      save={async () => {
        await customersApi.createContact(customerId, f);
        setF({ fullName: "" });
        done();
      }}>
      <Input
        label="نام و نام خانوادگی"
        value={f.fullName}
        set={(v) => setF({ ...f, fullName: v })}
      />
      <Input label="سمت" value={f.role} set={(v) => setF({ ...f, role: v })} />
      <Input
        label="موبایل"
        value={f.mobile}
        set={(v) => setF({ ...f, mobile: v })}
      />
      <Input
        label="ایمیل"
        value={f.email}
        set={(v) => setF({ ...f, email: v })}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!f.isPrimary}
          onChange={(e) => setF({ ...f, isPrimary: e.target.checked })}
        />{" "}
        مخاطب اصلی
      </label>
    </SimpleModal>
  );
}
