import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";

export const REQUIRED = ["KRI", "Department", "Period", "Actual", "Green_Limit", "Red_From"] as const;
export type Canonical = typeof REQUIRED[number] | "Direction";
export type KriRow = Record<string, string | number> & { KRI: string; Department: string; Period: string; Actual: number; Green_Limit: number; Red_From: number; Direction: string; RAG_Status?: string };

const aliases: Record<Canonical, string[]> = {
  KRI: ["kri", "kri name", "indicator", "indicator name", "key risk indicator", "risk indicator", "risk metric", "metric", "parameter", "measure"],
  Department: ["department", "department name", "unit", "business unit", "business function", "division", "office", "owner department", "responsible department"],
  Period: ["period", "reporting period", "reporting month", "month", "month year", "report month", "as of date", "date", "month end"],
  Actual: ["actual", "actual value", "current value", "reported value", "value", "result", "achieved", "current month value", "observed value"],
  Green_Limit: ["green limit", "green threshold", "green", "green target", "appetite limit", "tolerance limit", "acceptable limit", "threshold green", "green boundary"],
  Red_From: ["red from", "red threshold", "red limit", "red", "red trigger", "critical threshold", "breach limit", "threshold red", "red boundary"],
  Direction: ["direction", "risk direction", "indicator direction", "trend direction", "higher lower", "risk polarity"]
};
const aliasMap = new Map<string, Canonical>();
for (const [key, values] of Object.entries(aliases) as [Canonical, string[]][]) {
  for (const value of values) aliasMap.set(normalizeHeader(value), key);
}
export function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/%/g, " percent ").replace(/[^a-z0-9]+/g, " ").trim();
}
function cellText(value: ExcelJS.CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map(part => part.text).join("");
  }
  return String(value);
}
async function parseWorkbook(buffer: Buffer, filename: string) {
  let matrix: string[][];
  if (filename.endsWith(".csv")) {
    matrix = parseCsv(buffer, { bom: true, skip_empty_lines: true, relax_column_count: true }) as string[][];
    matrix = matrix.map(row => row.map(cell => String(cell ?? "")));
  } else if (filename.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("The workbook does not contain a worksheet.");
    matrix = [];
    sheet.eachRow({ includeEmpty: false }, row => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => { values[colNumber - 1] = cellText(cell.value); });
      matrix.push(values.map(value => value ?? ""));
    });
  } else {
    throw new Error("Legacy .xls files are not supported. Save the workbook as .xlsx or CSV and upload it again.");
  }
  if (!matrix.length) throw new Error("The uploaded dataset is empty.");
  let headerIndex = -1, bestScore = 0;
  matrix.slice(0, 10).forEach((row, index) => {
    const mapped = row.map(cell => aliasMap.get(normalizeHeader(cell))).filter(Boolean);
    const score = new Set(mapped).size;
    if (score > bestScore) { bestScore = score; headerIndex = index; }
  });
  if (headerIndex < 0 || bestScore < 4) {
    throw new Error("Could not confidently identify the headings. Include clear columns for KRI, Department, Period, Actual, Green Threshold and Red Threshold.");
  }
  const headers = (matrix[headerIndex] ?? []).map(cell => String(cell ?? "").trim());
  const dataRows = matrix.slice(headerIndex + 1).filter(row => row.some(cell => String(cell ?? "").trim() !== ""));
  const mapping: Partial<Record<Canonical, string>> = {};
  const conflicts: Record<string, string[]> = {};
  headers.forEach(header => {
    const canonical = aliasMap.get(normalizeHeader(header));
    if (!canonical) return;
    if (mapping[canonical]) conflicts[canonical] = [...(conflicts[canonical] ?? [mapping[canonical]!]), header];
    else mapping[canonical] = header;
  });
  const records = dataRows.map(row => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => { if (header) record[header] = row[index] ?? ""; });
    return record;
  });
  const missing = REQUIRED.filter(field => !mapping[field]);
  return { headerRow: headerIndex + 1, dataRows: records, mapping, missing, conflicts, filename };
}
export async function inspectDataset(buffer: Buffer, filename: string) {
  const parsed = await parseWorkbook(buffer, filename);
  return {
    file_name: filename, header_row: parsed.headerRow, data_rows: parsed.dataRows.length,
    detected_columns: Object.entries(parsed.mapping).map(([field, source_column]) => ({ field, source_column })),
    missing_fields: parsed.missing, optional_direction: parsed.mapping.Direction ?? "Defaults to HIGHER",
    ambiguous_fields: parsed.conflicts, ready: parsed.missing.length === 0 && Object.keys(parsed.conflicts).length === 0,
    sample_rows: parsed.dataRows.slice(0, 3)
  };
}
export async function normalizeDataset(buffer: Buffer, filename: string): Promise<KriRow[]> {
  const parsed = await parseWorkbook(buffer, filename);
  if (Object.keys(parsed.conflicts).length) throw new Error("More than one column matches: " + Object.keys(parsed.conflicts).join(", ") + ". Keep one matching column for each field.");
  if (parsed.missing.length) throw new Error("Missing required fields: " + parsed.missing.join(", "));
  if (!parsed.dataRows.length) throw new Error("The uploaded dataset has no data rows.");
  if (parsed.dataRows.length > 5000) throw new Error("A maximum of 5,000 KRI rows can be processed at once.");
  return parsed.dataRows.map((source, index) => {
    const value = (field: Canonical) => source[parsed.mapping[field] ?? ""] ?? "";
    const actual = Number(String(value("Actual")).replace(/,/g, ""));
    const green = Number(String(value("Green_Limit")).replace(/,/g, ""));
    const red = Number(String(value("Red_From")).replace(/,/g, ""));
    const direction = String(value("Direction") || "HIGHER").trim().toUpperCase();
    const kri = String(value("KRI")).trim(), department = String(value("Department")).trim(), period = String(value("Period")).trim();
    if (!kri || !department || !period) throw new Error("KRI, Department and Period cannot be blank (data row " + (index + 1) + ").");
    if (![actual, green, red].every(Number.isFinite)) throw new Error("Actual and threshold fields must be valid numeric values (data row " + (index + 1) + ").");
    if (direction !== "HIGHER" && direction !== "LOWER") throw new Error("Direction must be HIGHER or LOWER (data row " + (index + 1) + ").");
    if (direction === "HIGHER" && green >= red) throw new Error("For HIGHER indicators, Green Limit must be lower than Red Threshold (data row " + (index + 1) + ").");
    if (direction === "LOWER" && green <= red) throw new Error("For LOWER indicators, Green Limit must be higher than Red Threshold (data row " + (index + 1) + ").");
    const status = kri.toLowerCase().includes("employee turnover")
      ? (actual < green ? "GREEN" : actual === green ? "THRESHOLD GAP" : actual <= red ? "AMBER" : "RED")
      : direction === "HIGHER" ? (actual <= green ? "GREEN" : actual >= red ? "RED" : "AMBER") : (actual >= green ? "GREEN" : actual <= red ? "RED" : "AMBER");
    return { KRI: kri, Department: department, Period: period, Actual: actual, Green_Limit: green, Red_From: red, Direction: direction, RAG_Status: status };
  });
}
