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
  rows: Array<Array<string | number>>
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
