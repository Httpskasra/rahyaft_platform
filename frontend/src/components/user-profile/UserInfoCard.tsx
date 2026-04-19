"use client";

import React, { useMemo, useState } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

type PersonalInfo = {
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: string;
  nationalId: string;
  birthPlace: string;
  residence: string;
  mobile: string;
  homePhone: string;
};

type EducationInfo = {
  degree: string;
  institution: string;
  graduationYear: string;
};

type RelativeInfo = {
  name: string;
  relation: string;
  address: string;
  phone: string;
};

type ProfileForm = {
  personal: PersonalInfo;
  education: EducationInfo;
  relatives: RelativeInfo[];
};

const emptyRelative = (): RelativeInfo => ({
  name: "",
  relation: "",
  address: "",
  phone: "",
});

const isEmpty = (v: string) => !v || !v.trim();

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();

  const [form, setForm] = useState<ProfileForm>({
    personal: {
      firstName: "",
      lastName: "",
      fatherName: "",
      birthDate: "",
      nationalId: "",
      birthPlace: "",
      residence: "",
      mobile: "",
      homePhone: "",
    },
    education: {
      degree: "",
      institution: "",
      graduationYear: "",
    },
    relatives: [emptyRelative()],
  });

  const relativesForView = useMemo(() => {
    // فقط بستگانی که حداقل یکی از فیلدها پر شده رو نمایش بده
    return form.relatives.filter(
      (r) => !(isEmpty(r.name) && isEmpty(r.relation) && isEmpty(r.address) && isEmpty(r.phone))
    );
  }, [form.relatives]);

  const handleSave = () => {
    // TODO: send to API
    console.log("Saving profile form:", form);
    closeModal();
  };

  const setPersonal = (key: keyof PersonalInfo, value: string) => {
    setForm((prev) => ({ ...prev, personal: { ...prev.personal, [key]: value } }));
  };

  const setEducation = (key: keyof EducationInfo, value: string) => {
    setForm((prev) => ({ ...prev, education: { ...prev.education, [key]: value } }));
  };

  const setRelative = (index: number, key: keyof RelativeInfo, value: string) => {
    setForm((prev) => {
      const relatives = [...prev.relatives];
      relatives[index] = { ...relatives[index], [key]: value };
      return { ...prev, relatives };
    });
  };

  const addRelative = () => {
    setForm((prev) => ({ ...prev, relatives: [...prev.relatives, emptyRelative()] }));
  };

  const removeRelative = (index: number) => {
    setForm((prev) => {
      const next = prev.relatives.filter((_, i) => i !== index);
      return { ...prev, relatives: next.length ? next : [emptyRelative()] };
    });
  };

  return (
    <div dir="rtl" className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            مشخصات پروفایل
          </h4>

          {/* نمایش کامل اطلاعات */}
          <div className="mt-6 space-y-10">
            {/* Personal */}
            <SectionView title="مشخصات فردی">
              <GridView>
                <ViewItem label="نام" value={form.personal.firstName} />
                <ViewItem label="نام خانوادگی" value={form.personal.lastName} />
                <ViewItem label="نام پدر" value={form.personal.fatherName} />
                <ViewItem label="تاریخ تولد" value={form.personal.birthDate} />
                <ViewItem label="کد ملی" value={form.personal.nationalId} ltr />
                <ViewItem label="محل تولد" value={form.personal.birthPlace} />
                <ViewItem label="محل اقامت" value={form.personal.residence} />
                <ViewItem label="تلفن همراه" value={form.personal.mobile} ltr />
                <ViewItem label="تلفن منزل" value={form.personal.homePhone} ltr />
              </GridView>
            </SectionView>

            {/* Education */}
            <SectionView title="مشخصات تحصیلی">
              <GridView>
                <ViewItem label="مدرک" value={form.education.degree} />
                <ViewItem label="محل تحصیل" value={form.education.institution} />
                <ViewItem label="سال اخذ مدرک" value={form.education.graduationYear} ltr />
              </GridView>
            </SectionView>

            {/* Relatives */}
            <SectionView title="مشخصات بستگان">
              {relativesForView.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  هنوز مشخصات بستگان وارد نشده است.
                </p>
              ) : (
                <div className="space-y-4">
                  {relativesForView.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          بستگان {idx + 1}
                        </p>
                      </div>

                      <GridView>
                        <ViewItem label="نام" value={r.name} />
                        <ViewItem label="سمت / نسبت" value={r.relation} />
                        <ViewItem label="آدرس" value={r.address} />
                        <ViewItem label="تلفن" value={r.phone} ltr />
                      </GridView>
                    </div>
                  ))}
                </div>
              )}
            </SectionView>
          </div>
        </div>

        {/* دکمه ویرایش */}
        <button
          onClick={openModal}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
        >
          <svg
            className="fill-current"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
            />
          </svg>
          ویرایش
        </button>
      </div>

      {/* Modal (ورودی همه فیلدها) */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[900px] m-4">
        <div className="no-scrollbar relative w-full max-w-[900px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              ویرایش اطلاعات پروفایل
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              اطلاعات زیر را تکمیل/به‌روزرسانی کنید.
            </p>
          </div>

          <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
            <div className="custom-scrollbar h-[520px] overflow-y-auto px-2 pb-3 space-y-10">
              {/* Personal */}
              <SectionEdit title="مشخصات فردی">
                <GridEdit>
                  <Field label="نام">
                    <Input value={form.personal.firstName} onChange={(e: any) => setPersonal("firstName", e.target.value)} />
                  </Field>

                  <Field label="نام خانوادگی">
                    <Input value={form.personal.lastName} onChange={(e: any) => setPersonal("lastName", e.target.value)} />
                  </Field>

                  <Field label="نام پدر">
                    <Input value={form.personal.fatherName} onChange={(e: any) => setPersonal("fatherName", e.target.value)} />
                  </Field>

                  <Field label="تاریخ تولد">
                    <Input
                      type="text"
                      placeholder="مثلاً 1380/01/15"
                      value={form.personal.birthDate}
                      onChange={(e: any) => setPersonal("birthDate", e.target.value)}
                    />
                  </Field>

                  <Field label="کد ملی">
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      value={form.personal.nationalId}
                      onChange={(e: any) => setPersonal("nationalId", e.target.value)}
                    />
                  </Field>

                  <Field label="محل تولد">
                    <Input value={form.personal.birthPlace} onChange={(e: any) => setPersonal("birthPlace", e.target.value)} />
                  </Field>

                  <Field label="محل اقامت">
                    <Input value={form.personal.residence} onChange={(e: any) => setPersonal("residence", e.target.value)} />
                  </Field>

                  <Field label="تلفن همراه">
                    <Input dir="ltr" inputMode="tel" value={form.personal.mobile} onChange={(e: any) => setPersonal("mobile", e.target.value)} />
                  </Field>

                  <Field label="تلفن منزل">
                    <Input dir="ltr" inputMode="tel" value={form.personal.homePhone} onChange={(e: any) => setPersonal("homePhone", e.target.value)} />
                  </Field>
                </GridEdit>
              </SectionEdit>

              {/* Education */}
              <SectionEdit title="مشخصات تحصیلی">
                <GridEdit>
                  <Field label="مدرک">
                    <Input value={form.education.degree} onChange={(e: any) => setEducation("degree", e.target.value)} />
                  </Field>

                  <Field label="محل تحصیل">
                    <Input value={form.education.institution} onChange={(e: any) => setEducation("institution", e.target.value)} />
                  </Field>

                  <Field label="سال اخذ مدرک">
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="مثلاً 1402"
                      value={form.education.graduationYear}
                      onChange={(e: any) => setEducation("graduationYear", e.target.value)}
                    />
                  </Field>
                </GridEdit>
              </SectionEdit>

              {/* Relatives */}
              <SectionEdit
                title="مشخصات چند نفر از بستگان"
                action={
                  <Button size="sm" variant="outline" onClick={addRelative}>
                    افزودن بستگان
                  </Button>
                }
              >
                <div className="space-y-6">
                  {form.relatives.map((r, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h6 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          بستگان {idx + 1}
                        </h6>

                        <Button size="sm" variant="outline" onClick={() => removeRelative(idx)}>
                          حذف
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                        <Field label="نام">
                          <Input value={r.name} onChange={(e: any) => setRelative(idx, "name", e.target.value)} />
                        </Field>

                        <Field label="سمت / نسبت">
                          <Input value={r.relation} onChange={(e: any) => setRelative(idx, "relation", e.target.value)} />
                        </Field>

                        <Field label="آدرس">
                          <Input value={r.address} onChange={(e: any) => setRelative(idx, "address", e.target.value)} />
                        </Field>

                        <Field label="تلفن">
                          <Input dir="ltr" inputMode="tel" value={r.phone} onChange={(e: any) => setRelative(idx, "phone", e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionEdit>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>
                بستن
              </Button>
              <Button size="sm" onClick={handleSave}>
                ذخیره تغییرات
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

/* ---------- View helpers ---------- */

function SectionView({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h5 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h5>
      {children}
    </section>
  );
}

function GridView({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      {children}
    </div>
  );
}

function ViewItem({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90" dir={ltr ? "ltr" : "rtl"}>
        {value && value.trim() ? value : "—"}
      </p>
    </div>
  );
}

/* ---------- Edit helpers ---------- */

function SectionEdit({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h5 className="text-lg font-medium text-gray-800 dark:text-white/90">{title}</h5>
        {action}
      </div>
      {children}
    </section>
  );
}

function GridEdit({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
