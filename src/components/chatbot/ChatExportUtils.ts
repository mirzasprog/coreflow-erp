import { exportToExcel, exportToPrintablePdf, ExportRow } from "@/lib/exporters";
import * as XLSX from "xlsx";

export interface ChartData {
  type: "bar" | "line" | "pie";
  title: string;
  data: Array<{ name: string; value: number; [key: string]: any }>;
}

export interface ExportData {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}

export const parseChartData = (content: string): { text: string; charts: ChartData[] } => {
  const charts: ChartData[] = [];
  const chartRegex = /\[CHART_DATA\]([\s\S]*?)\[\/CHART_DATA\]/g;
  let match;
  let cleanText = content;

  while ((match = chartRegex.exec(content)) !== null) {
    try {
      const chartData = JSON.parse(match[1]);
      charts.push(chartData);
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.error('Failed to parse chart data:', e);
    }
  }

  return { text: cleanText.trim(), charts };
};

export const parseExportData = (content: string): { text: string; exports: ExportData[] } => {
  const exports: ExportData[] = [];
  const exportRegex = /\[EXPORT_DATA\]([\s\S]*?)\[\/EXPORT_DATA\]/g;
  let match;
  let cleanText = content;

  while ((match = exportRegex.exec(content)) !== null) {
    try {
      const exportData = JSON.parse(match[1]);
      exports.push(exportData);
      cleanText = cleanText.replace(match[0], '');
    } catch (e) {
      console.error('Failed to parse export data:', e);
    }
  }

  return { text: cleanText.trim(), exports };
};

export const exportToWord = (title: string, content: string, tableData?: ExportData) => {
  let htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; font-size: 24px; margin-bottom: 20px; }
        p { line-height: 1.6; margin-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        .timestamp { color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div>${content.replace(/\n/g, '<br>')}</div>
  `;

  if (tableData) {
    htmlContent += `
      <table>
        <thead>
          <tr>${tableData.columns.map(col => `<th>${col}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${tableData.rows.map(row => 
            `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    `;
  }

  htmlContent += `
      <p class="timestamp">Generirano: ${new Date().toLocaleString('hr-HR')}</p>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportChatToExcel = (data: ExportData) => {
  const rows: ExportRow[] = data.rows.map(row => {
    const obj: ExportRow = {};
    data.columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
  
  exportToExcel(rows, data.title, `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportChatToPdf = (title: string, content: string, tableData?: ExportData) => {
  if (tableData) {
    exportToPrintablePdf(
      title,
      `Generirano: ${new Date().toLocaleString('hr-HR')}`,
      tableData.columns,
      tableData.rows
    );
  } else {
    // For text-only content, create a simple table format
    const lines = content.split('\n').filter(line => line.trim());
    exportToPrintablePdf(
      title,
      `Generirano: ${new Date().toLocaleString('hr-HR')}`,
      ['Sadržaj'],
      lines.map(line => [line])
    );
  }
};
