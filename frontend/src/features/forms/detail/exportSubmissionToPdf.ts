import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Submission } from "@/lib/api/forms";
import type { SchemaField } from "@/features/forms/detail/types";
import { approvalsApi, type ApprovalInstanceStatus } from "@/lib/api/approvals";

export interface PdfFormMeta {
  customId?: string;
  description?: string;
}

type PdfBlock = {
  html: string;
  estimatedHeight: number;
};

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;
const CONTENT_BUDGET_PX = 820;

/**
 * Exports a submission as a controlled-document style A4 form.
 *
 * The layout intentionally resembles the paper forms used by Rahyaft Teb:
 * - framed document header with form code/revision/date/page
 * - compact table-like fields instead of UI cards
 * - section title bars
 * - boxed approval/signature area
 * - page-aware rendering so rows are not cut between A4 pages
 */
export async function exportSubmissionToPDF(
  submission: Submission,
  formName: string,
  fields: SchemaField[],
  meta: PdfFormMeta = {},
) {
  let approval: ApprovalInstanceStatus | null = null;
  try {
    const response = await approvalsApi.getSubmissionStatus(submission.id);
    approval = response.data;
  } catch {
    // Forms without an approval workflow can still be exported.
  }

  const formCode = meta.customId?.trim() || `FRM-${submission.formId.slice(0, 8).toUpperCase()}`;
  const documentNo = submission.id.slice(0, 8).toUpperCase();
  const submittedAt = new Date(submission.createdAt);
  const dateText = submittedAt.toLocaleDateString("fa-IR");
  const timeText = submittedAt.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const blocks = buildFieldBlocks(submission, fields);
  const pages = paginateBlocks(blocks, approval);

  const host = document.createElement("div");
  host.dir = "rtl";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = `
    position: fixed;
    left: -100000px;
    top: 0;
    width: ${PAGE_WIDTH_PX}px;
    background: #ffffff;
    color: #111827;
    direction: rtl;
    font-family: Tahoma, Arial, sans-serif;
    z-index: -1;
  `;

  const approvalHtml = renderApprovalSection(approval);
  host.innerHTML = pages
    .map((pageBlocks, pageIndex) => {
      const isLastPage = pageIndex === pages.length - 1;
      return renderPage({
        formName,
        formCode,
        description: meta.description,
        documentNo,
        revision: submission.formVersion,
        submittedBy: submission.user?.name ?? "ناشناس",
        dateText,
        timeText,
        pageNumber: pageIndex + 1,
        totalPages: pages.length,
        bodyHtml: pageBlocks.map((block) => block.html).join(""),
        approvalHtml: isLastPage ? approvalHtml : "",
        submissionId: submission.id,
      });
    })
    .join("");

  document.body.appendChild(host);

  try {
    await waitForImages(host);

    const pageElements = Array.from(host.querySelectorAll<HTMLElement>("[data-pdf-page]"));
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let index = 0; index < pageElements.length; index += 1) {
      const page = pageElements[index];
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
        width: PAGE_WIDTH_PX,
        height: PAGE_HEIGHT_PX,
        windowWidth: PAGE_WIDTH_PX,
      });

      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
    }

    const safeName = formName.replace(/[\\/:*?"<>|]+/g, "-").trim() || "form";
    pdf.save(`${safeName}_${documentNo}.pdf`);
  } catch (error) {
    console.error("PDF generation failed", error);
    alert("خطا در ساخت PDF. لطفاً دوباره تلاش کنید.");
  } finally {
    document.body.removeChild(host);
  }
}

function renderPage(args: {
  formName: string;
  formCode: string;
  description?: string;
  documentNo: string;
  revision: number;
  submittedBy: string;
  dateText: string;
  timeText: string;
  pageNumber: number;
  totalPages: number;
  bodyHtml: string;
  approvalHtml: string;
  submissionId: string;
}): string {
  const {
    formName,
    formCode,
    description,
    documentNo,
    revision,
    submittedBy,
    dateText,
    timeText,
    pageNumber,
    totalPages,
    bodyHtml,
    approvalHtml,
    submissionId,
  } = args;

  return `
    <section data-pdf-page style="
      box-sizing:border-box;
      width:${PAGE_WIDTH_PX}px;
      height:${PAGE_HEIGHT_PX}px;
      padding:28px 30px 24px;
      background:#fff;
      overflow:hidden;
      position:relative;
      page-break-after:always;
    ">
      <div style="border:2px solid #27343b; min-height:100%; box-sizing:border-box; display:flex; flex-direction:column; background:#fff;">
        ${renderDocumentHeader({ formName, formCode, documentNo, revision, dateText, pageNumber, totalPages })}

        <div style="padding:8px 9px 0; flex:1; display:flex; flex-direction:column;">
          ${pageNumber === 1 ? `
            <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;margin-bottom:7px;">
              <tbody>
                <tr>
                  <td style="border:1px solid #38464d;background:#eef4f5;width:16%;padding:5px 7px;font-weight:700;">تکمیل‌کننده</td>
                  <td style="border:1px solid #38464d;width:34%;padding:5px 7px;">${escapeHtml(submittedBy)}</td>
                  <td style="border:1px solid #38464d;background:#eef4f5;width:12%;padding:5px 7px;font-weight:700;">تاریخ</td>
                  <td style="border:1px solid #38464d;width:18%;padding:5px 7px;">${escapeHtml(dateText)}</td>
                  <td style="border:1px solid #38464d;background:#eef4f5;width:9%;padding:5px 7px;font-weight:700;">ساعت</td>
                  <td style="border:1px solid #38464d;width:11%;padding:5px 7px;">${escapeHtml(timeText)}</td>
                </tr>
              </tbody>
            </table>
            ${description ? `
              <div style="border:1px solid #38464d;margin-bottom:7px;font-size:10px;line-height:1.7;">
                <div style="background:#dbecef;border-bottom:1px solid #38464d;padding:4px 7px;font-weight:700;">شرح / هدف فرم</div>
                <div style="padding:5px 8px;min-height:25px;">${escapeHtml(description)}</div>
              </div>
            ` : ""}
          ` : ""}

          <div style="background:#dbecef;border:1px solid #38464d;border-bottom:none;padding:4px 8px;font-size:11px;font-weight:700;text-align:center;">
            اطلاعات فرم
          </div>

          <div style="border-top:1px solid #38464d;">
            ${bodyHtml || `<div style="border:1px solid #38464d;border-top:none;padding:12px;text-align:center;font-size:11px;color:#66757c;">اطلاعاتی برای نمایش وجود ندارد.</div>`}
          </div>

          ${approvalHtml}

          <div style="margin-top:auto;padding-top:8px;">
            <div style="border-top:1px solid #74838a;padding:5px 2px 0;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:8.5px;color:#526168;direction:rtl;">
              <span>شناسه سند: ${escapeHtml(submissionId)}</span>
              <span>این نسخه به صورت الکترونیکی از سامانه سازمانی رهیافت طب تولید شده است.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDocumentHeader(args: {
  formName: string;
  formCode: string;
  documentNo: string;
  revision: number;
  dateText: string;
  pageNumber: number;
  totalPages: number;
}): string {
  const { formName, formCode, documentNo, revision, dateText, pageNumber, totalPages } = args;

  return `
    <div style="display:grid;grid-template-columns:145px 1fr 168px;min-height:92px;border-bottom:2px solid #27343b;direction:rtl;">
      <div style="border-left:1px solid #38464d;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7px;">
        <div style="font-size:20px;font-weight:900;letter-spacing:-1px;color:#173c4a;line-height:1.05;">رهیافت طب</div>
        <div style="font-size:9px;font-weight:700;color:#3b6f7d;letter-spacing:1px;margin-top:2px;">Rahyaft Teb</div>
        <div style="height:3px;width:72px;background:#2f7482;margin-top:5px;"></div>
        <div style="font-size:8px;color:#526168;margin-top:5px;">سامانه مدیریت سازمانی</div>
      </div>

      <div style="display:flex;align-items:center;justify-content:center;text-align:center;padding:8px 12px;">
        <div>
          <div style="font-size:10px;color:#526168;margin-bottom:5px;">فرم سازمانی</div>
          <div style="font-size:16px;font-weight:900;line-height:1.7;">${escapeHtml(formName)}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed;direction:rtl;">
        <tbody>
          ${metaRow("کد فرم", formCode)}
          ${metaRow("شماره سند", documentNo)}
          ${metaRow("ویرایش", String(revision))}
          ${metaRow("تاریخ", dateText)}
          ${metaRow("صفحه", `${pageNumber} از ${totalPages}`)}
        </tbody>
      </table>
    </div>
  `;
}

function metaRow(label: string, value: string): string {
  return `
    <tr>
      <td style="border-right:1px solid #38464d;border-bottom:1px solid #38464d;background:#e8f0f2;width:43%;padding:3px 5px;font-weight:700;">${escapeHtml(label)}</td>
      <td style="border-bottom:1px solid #38464d;padding:3px 5px;text-align:center;direction:ltr;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function buildFieldBlocks(submission: Submission, fields: SchemaField[]): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  let compactPair: SchemaField[] = [];

  const flushPair = () => {
    if (compactPair.length === 0) return;
    blocks.push({
      html: renderCompactFields(compactPair, submission),
      estimatedHeight: 47,
    });
    compactPair = [];
  };

  for (const field of fields) {
    if (field.type === "table") {
      flushPair();
      const rows = Array.isArray(submission.data[field.id])
        ? (submission.data[field.id] as unknown[]).length
        : 0;
      blocks.push({
        html: renderTableField(field, submission.data[field.id]),
        estimatedHeight: 78 + Math.max(rows, 1) * 30,
      });
      continue;
    }

    if (field.type === "textarea") {
      flushPair();
      blocks.push({
        html: renderLongField(field, submission.data[field.id]),
        estimatedHeight: 86,
      });
      continue;
    }

    if (field.type === "checkbox" || field.type === "radio") {
      flushPair();
      blocks.push({
        html: renderOptionField(field, submission.data[field.id]),
        estimatedHeight: 63 + Math.ceil((field.options?.length ?? 0) / 4) * 18,
      });
      continue;
    }

    compactPair.push(field);
    if (compactPair.length === 2) flushPair();
  }

  flushPair();
  return blocks;
}

function renderCompactFields(fields: SchemaField[], submission: Submission): string {
  const cells = fields.map((field) => {
    const value = formatSimpleValue(submission.data[field.id]);
    return `
      <td style="border:1px solid #38464d;border-top:none;width:50%;padding:0;vertical-align:stretch;">
        <table style="width:100%;height:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;">
          <tbody>
            <tr>
              <td style="width:38%;background:#f0f4f5;padding:6px 7px;font-weight:700;border-left:1px solid #8b969b;line-height:1.5;">
                ${escapeHtml(field.label)}${field.required ? `<span style="color:#8b1e1e;font-size:8px;"> *</span>` : ""}
              </td>
              <td style="padding:6px 8px;line-height:1.6;word-break:break-word;">${escapeHtml(value)}</td>
            </tr>
          </tbody>
        </table>
      </td>
    `;
  });

  if (cells.length === 1) {
    cells.push(`<td style="border:1px solid #38464d;border-top:none;width:50%;background:#fff;"></td>`);
  }

  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl;"><tbody><tr>${cells.join("")}</tr></tbody></table>`;
}

function renderLongField(field: SchemaField, rawValue: unknown): string {
  return `
    <div style="border:1px solid #38464d;border-top:none;font-size:10px;">
      <div style="background:#f0f4f5;border-bottom:1px solid #8b969b;padding:5px 7px;font-weight:700;">
        ${escapeHtml(field.label)}${field.required ? `<span style="color:#8b1e1e;font-size:8px;"> *</span>` : ""}
      </div>
      <div style="padding:7px 9px;min-height:44px;line-height:1.8;white-space:pre-wrap;word-break:break-word;">${escapeHtml(formatSimpleValue(rawValue))}</div>
    </div>
  `;
}

function renderOptionField(field: SchemaField, rawValue: unknown): string {
  const selected = new Set(
    Array.isArray(rawValue) ? rawValue.map(String) : rawValue == null ? [] : [String(rawValue)],
  );
  const isRadio = field.type === "radio";
  const options = field.options ?? [];

  return `
    <div style="border:1px solid #38464d;border-top:none;font-size:10px;">
      <div style="display:flex;align-items:stretch;">
        <div style="width:24%;background:#f0f4f5;border-left:1px solid #8b969b;padding:6px 7px;font-weight:700;">
          ${escapeHtml(field.label)}${field.required ? `<span style="color:#8b1e1e;font-size:8px;"> *</span>` : ""}
        </div>
        <div style="flex:1;padding:5px 7px;display:flex;flex-wrap:wrap;gap:5px 16px;align-items:center;">
          ${options.length ? options.map((option) => {
            const checked = selected.has(option);
            return `
              <span style="display:inline-flex;align-items:center;gap:4px;white-space:nowrap;">
                <span style="width:12px;height:12px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #27343b;${isRadio ? "border-radius:50%;" : ""}font-size:10px;font-weight:900;line-height:1;">
                  ${checked ? (isRadio ? "●" : "✓") : ""}
                </span>
                ${escapeHtml(option)}
              </span>
            `;
          }).join("") : escapeHtml(formatSimpleValue(rawValue))}
        </div>
      </div>
    </div>
  `;
}

function renderTableField(field: SchemaField, rawValue: unknown): string {
  const rows = Array.isArray(rawValue) ? (rawValue as Record<string, unknown>[]) : [];
  const columns = field.columns ?? [];

  return `
    <div style="border:1px solid #38464d;border-top:none;font-size:9.5px;page-break-inside:avoid;">
      <div style="background:#dbecef;border-bottom:1px solid #38464d;padding:5px 7px;font-weight:700;text-align:center;">${escapeHtml(field.label)}</div>
      ${field.description ? `<div style="padding:4px 7px;border-bottom:1px solid #8b969b;color:#526168;font-size:8.5px;">${escapeHtml(field.description)}</div>` : ""}
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl;">
        <thead>
          <tr style="background:#eef3f4;">
            <th style="width:32px;border-left:1px solid #8b969b;border-bottom:1px solid #38464d;padding:5px 3px;text-align:center;">ردیف</th>
            ${columns.length ? columns.map((col) => `<th style="border-left:1px solid #8b969b;border-bottom:1px solid #38464d;padding:5px 4px;text-align:center;line-height:1.4;">${escapeHtml(col.label)}</th>`).join("") : `<th style="border-bottom:1px solid #38464d;padding:5px;">مقدار</th>`}
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((row, rowIndex) => `
            <tr>
              <td style="border-left:1px solid #8b969b;border-bottom:${rowIndex === rows.length - 1 ? "none" : "1px solid #b6bec2"};padding:5px 3px;text-align:center;">${rowIndex + 1}</td>
              ${columns.length ? columns.map((col, colIndex) => `<td style="border-left:${colIndex === columns.length - 1 ? "none" : "1px solid #8b969b"};border-bottom:${rowIndex === rows.length - 1 ? "none" : "1px solid #b6bec2"};padding:5px 5px;text-align:center;line-height:1.5;word-break:break-word;">${escapeHtml(formatSimpleValue(row[col.id]))}</td>`).join("") : `<td style="padding:5px;">${escapeHtml(JSON.stringify(row))}</td>`}
            </tr>
          `).join("") : `
            <tr>
              <td style="border-left:1px solid #8b969b;padding:7px;text-align:center;">1</td>
              <td colspan="${Math.max(columns.length, 1)}" style="padding:7px;color:#66757c;text-align:center;">—</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function paginateBlocks(blocks: PdfBlock[], approval: ApprovalInstanceStatus | null): PdfBlock[][] {
  const pages: PdfBlock[][] = [];
  let page: PdfBlock[] = [];
  let used = 0;

  for (const block of blocks) {
    const firstPageAllowance = pages.length === 0 ? CONTENT_BUDGET_PX - 95 : CONTENT_BUDGET_PX;
    const allowance = firstPageAllowance;

    if (page.length > 0 && used + block.estimatedHeight > allowance) {
      pages.push(page);
      page = [];
      used = 0;
    }

    page.push(block);
    used += block.estimatedHeight;
  }

  if (page.length > 0 || pages.length === 0) pages.push(page);

  // Keep enough room for signatures on the final page. If the final page is already
  // dense, signatures get their own A4 page just like controlled paper forms.
  const approvalHeight = estimateApprovalHeight(approval);
  if (approvalHeight > 0) {
    const last = pages[pages.length - 1];
    const lastHeight = last.reduce((sum, block) => sum + block.estimatedHeight, 0);
    const lastAllowance = pages.length === 1 ? CONTENT_BUDGET_PX - 95 : CONTENT_BUDGET_PX;
    if (lastHeight + approvalHeight > lastAllowance) pages.push([]);
  }

  return pages;
}

function estimateApprovalHeight(approval: ApprovalInstanceStatus | null): number {
  if (!approval || approval.actions.length === 0) return 0;
  return 98 + Math.ceil(approval.actions.length / 2) * 150;
}

function renderApprovalSection(approval: ApprovalInstanceStatus | null): string {
  if (!approval || approval.actions.length === 0) return "";

  const statusLabel =
    approval.status === "APPROVED" ? "تأیید نهایی شده"
      : approval.status === "REJECTED" ? "رد شده"
        : "در حال تأیید";

  return `
    <div style="margin-top:8px;page-break-inside:avoid;">
      <div style="background:#dbecef;border:1px solid #38464d;padding:4px 8px;font-size:11px;font-weight:700;text-align:center;">
        تأییدها و امضاها
      </div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px;direction:rtl;">
        <tbody>
          <tr>
            <td style="border:1px solid #38464d;border-top:none;background:#eef3f4;width:15%;padding:4px 6px;font-weight:700;">وضعیت نهایی</td>
            <td style="border:1px solid #38464d;border-top:none;padding:4px 6px;font-weight:700;">${escapeHtml(statusLabel)}</td>
          </tr>
        </tbody>
      </table>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-right:1px solid #38464d;">
        ${approval.actions.map((item) => `
          <div style="border-left:1px solid #38464d;border-bottom:1px solid #38464d;min-height:140px;display:flex;flex-direction:column;">
            <div style="background:#f0f4f5;border-bottom:1px solid #8b969b;padding:4px 6px;text-align:center;font-weight:700;font-size:9px;">
              مرحله ${item.step?.stepOrder ?? "—"} - ${escapeHtml(item.step?.role?.name ?? "تأییدکننده")}
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:8.5px;table-layout:fixed;">
              <tbody>
                <tr>
                  <td style="width:27%;background:#fafcfc;border-left:1px solid #c0c7ca;border-bottom:1px solid #c0c7ca;padding:3px 5px;font-weight:700;">نام</td>
                  <td style="border-bottom:1px solid #c0c7ca;padding:3px 5px;">${escapeHtml(item.approver?.name ?? "—")}</td>
                </tr>
                <tr>
                  <td style="background:#fafcfc;border-left:1px solid #c0c7ca;border-bottom:1px solid #c0c7ca;padding:3px 5px;font-weight:700;">اقدام</td>
                  <td style="border-bottom:1px solid #c0c7ca;padding:3px 5px;">${item.action === "APPROVED" ? "تأیید" : "رد"} - ${new Date(item.createdAt).toLocaleString("fa-IR")}</td>
                </tr>
              </tbody>
            </table>
            <div style="flex:1;min-height:70px;display:flex;align-items:center;justify-content:center;padding:4px;background:#fff;">
              ${item.signatureDataUrl ? `<img src="${item.signatureDataUrl}" alt="امضا" style="max-width:170px;max-height:66px;object-fit:contain;" />` : `<span style="color:#8a969b;font-size:8px;">امضا ثبت نشده است</span>`}
            </div>
            ${item.comments ? `<div style="border-top:1px solid #c0c7ca;padding:4px 6px;font-size:8px;line-height:1.5;"><b>توضیحات:</b> ${escapeHtml(item.comments)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function formatSimpleValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map(String).join("، ") : "—";
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }
  return String(value);
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

function escapeHtml(value: string): string {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
