import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Submission } from "@/lib/api/forms";
import type { SchemaField } from "@/features/forms/detail/types";

export async function exportSubmissionToPDF(
  submission: Submission,
  formName: string,
  fields: SchemaField[],
) {
  // Create a temporary container
  const container = document.createElement("div");
  container.dir = "rtl";
  container.style.cssText = `
    background: white;
    padding: 2rem;
    font-family: 'IRANSans', 'Tahoma', sans-serif;
    max-width: 800px;
    margin: 0 auto;
    color: #1f2937;
    direction: rtl;
  `;

  // Build HTML content
  container.innerHTML = `
    <div style="margin-bottom: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem;">
      <h1 style="font-size: 1.8rem; font-weight: bold; margin: 0 0 0.5rem 0;">${escapeHtml(formName)}</h1>
      <p style="color: #6b7280; margin: 0; font-size: 0.9rem;">
        تاریخ ارسال: ${new Date(submission.createdAt).toLocaleString("fa-IR")}
      </p>
      <p style="color: #6b7280; margin: 0.25rem 0 0 0; font-size: 0.9rem;">
        کاربر: ${submission.user?.name ?? "ناشناس"}
      </p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      ${fields
        .map((field) => {
          const rawValue = submission.data[field.id];
          let displayValue = "—";
          if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
            if (Array.isArray(rawValue)) {
              displayValue = rawValue.join("، ");
            } else if (typeof rawValue === "object") {
              // For table fields: render as an HTML table
              if (field.type === "table" && Array.isArray(rawValue)) {
                const cols = field.columns || [];
                if (cols.length === 0) displayValue = JSON.stringify(rawValue);
                else {
                  displayValue = `
                    <table style="width: 100%; border-collapse: collapse; margin-top: 0.5rem;">
                      <thead>
                        <tr style="background: #f3f4f6;">
                          ${cols
                            .map(
                              (col) =>
                                `<th style="border: 1px solid #d1d5db; padding: 0.5rem; text-align: right;">${escapeHtml(col.label)}</th>`,
                            )
                            .join("")}
                        </tr>
                      </thead>
                      <tbody>
                        ${(rawValue as any[])
                          .map(
                            (row) => `
                          <tr>
                            ${cols
                              .map(
                                (col) =>
                                  `<td style="border: 1px solid #d1d5db; padding: 0.5rem;">${escapeHtml(String(row[col.id] ?? "—"))}</td>`,
                              )
                              .join("")}
                          </tr>
                        `,
                          )
                          .join("")}
                      </tbody>
                    </table>
                  `;
                }
              } else {
                displayValue = JSON.stringify(rawValue);
              }
            } else {
              displayValue = String(rawValue);
            }
          }
          return `
            <div style="border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong style="font-size: 1rem;">${escapeHtml(field.label)}</strong>
                ${field.required ? '<span style="color: #ef4444; font-size: 0.8rem;">(الزامی)</span>' : ""}
              </div>
              ${field.description ? `<p style="color: #6b7280; font-size: 0.8rem; margin-bottom: 0.75rem;">${escapeHtml(field.description)}</p>` : ""}
              <div style="background: #f9fafb; border-radius: 0.5rem; padding: 0.75rem;">
                ${typeof displayValue === "string" ? displayValue : `<div>${displayValue}</div>`}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${formName}_${submission.id}.pdf`);
  } catch (error) {
    console.error("PDF generation failed", error);
    alert("خطا در ساخت PDF. لطفاً دوباره تلاش کنید.");
  } finally {
    document.body.removeChild(container);
  }
}

// Helper to escape HTML
function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

