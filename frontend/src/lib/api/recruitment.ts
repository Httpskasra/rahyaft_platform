import { apiClient } from "./client";
import type {
  SharedFormAnswers,
  SharedFormSchema,
} from "@/components/forms/schema";
const PUBLIC =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1") +
  "/public/recruitment";
export const recruitmentApi = {
  publicJobs: () => fetch(`${PUBLIC}/jobs`).then((r) => r.json()),
  publicJob: (slug: string) =>
    fetch(`${PUBLIC}/jobs/${slug}`).then((r) => {
      if (!r.ok) throw new Error("موقعیت یافت نشد");
      return r.json();
    }),
  apply: (
    slug: string,
    payload: {
      fullName: string;
      phoneNumber: string;
      email?: string;
      nationalCode?: string;
      formVersionId: string;
      answers: SharedFormAnswers;
    },
  ) =>
    fetch(`${PUBLIC}/jobs/${slug}/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (r) => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.message ?? "خطا در ثبت");
      return d;
    }),
  applications: () =>
    apiClient.get("/recruitment/applications").then((r) => r.data),
  application: (id: string) =>
    apiClient.get(`/recruitment/applications/${id}`).then((r) => r.data),
  action: (id: string, action: string, data: unknown = {}) =>
    apiClient
      .post(`/recruitment/applications/${id}/${action}`, data)
      .then((r) => r.data),
  adminForms: () =>
    apiClient.get("/recruitment/admin/forms").then((r) => r.data),
  adminJobs: () => apiClient.get("/recruitment/admin/jobs").then((r) => r.data),
};
