import * as XLSX from "xlsx";

export type ExportRow = Record<string, string | number | null | undefined>;

export const exportToExcel = (
  rows: ExportRow[],
  sheetName: string,
  fileName: string
) => {
  if (!rows?.length) return;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

export const exportToPrintablePdf = (
  title: string,
  subtitle: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  signature?: string | null
) => {
  if (typeof window === "undefined" || !rows?.length) return;

  const tableHead = headers
    .map((header) => `<th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">${header}</th>`)
    .join("");

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#111827;">${
                cell ?? "—"
              }</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const signatureHtml = signature 
    ? `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;">
         <p style="font-size:12px;color:#6b7280;margin-bottom:8px;">Digitalni potpis / Digital Signature:</p>
         <img src="${signature}" alt="Potpis" style="max-width:200px;max-height:80px;" />
         <p style="font-size:10px;color:#9ca3af;margin-top:4px;">Datum: ${new Date().toLocaleDateString('hr-HR')}</p>
       </div>`
    : `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;">
         <p style="font-size:12px;color:#6b7280;margin-bottom:40px;">Potpis / Signature:</p>
         <div style="border-top:1px solid #9ca3af;width:200px;padding-top:4px;">
           <p style="font-size:10px;color:#9ca3af;">Datum: _______________</p>
         </div>
       </div>`;

  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; }
          h1 { font-size: 20px; margin: 0 0 4px 0; }
          h2 { font-size: 14px; margin: 0 0 16px 0; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; }
          @media print {
            body { padding: 12px; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <h2>${subtitle}</h2>
        <table>${tableHead ? `<thead><tr>${tableHead}</tr></thead>` : ""}<tbody>${tableRows}</tbody></table>
        ${signatureHtml}
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=1200,height=800");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
