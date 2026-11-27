import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { normalizeDataset } from "@/lib/kri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ detail: "Select a CSV or Excel file." }, { status: 400 });
    const filename = file.name.toLowerCase();
    if (!/\\.(csv|xlsx)$/.test(filename)) return NextResponse.json({ detail: "Upload a CSV or Excel file (.csv, .xlsx)." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ detail: "File size must not exceed 10 MB." }, { status: 413 });

    const rows = await normalizeDataset(Buffer.from(await file.arrayBuffer()), filename);
    const counts = { GREEN: 0, AMBER: 0, RED: 0, "THRESHOLD GAP": 0 };
    rows.forEach(row => { counts[row.RAG_Status as keyof typeof counts]++; });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NABIL KRI Management System";
    workbook.created = new Date();

    const summary = workbook.addWorksheet("Summary");
    summary.columns = [{ header: "Metric", key: "metric", width: 28 }, { header: "Count", key: "count", width: 16 }];
    summary.addRows([
      { metric: "Total KRIs analyzed", count: rows.length },
      { metric: "Green", count: counts.GREEN },
      { metric: "Amber", count: counts.AMBER },
      { metric: "Red", count: counts.RED },
      { metric: "Threshold Gap", count: counts["THRESHOLD GAP"] },
      { metric: "Generated (Nepal time)", count: new Date().toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" }) }
    ]);
    summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15364D" } };
    summary.views = [{ state: "frozen", ySplit: 1 }];

    const details = workbook.addWorksheet("Analyzed KRI Data");
    details.columns = [
      { header: "KRI", key: "KRI", width: 38 },
      { header: "Department", key: "Department", width: 26 },
      { header: "Period", key: "Period", width: 16 },
      { header: "Actual", key: "Actual", width: 14 },
      { header: "Green_Limit", key: "Green_Limit", width: 16 },
      { header: "Red_From", key: "Red_From", width: 14 },
      { header: "Direction", key: "Direction", width: 14 },
      { header: "RAG_Status", key: "RAG_Status", width: 18 }
    ];
    rows.forEach(row => details.addRow(row));
    details.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    details.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15364D" } };
    details.autoFilter = { from: "A1", to: "H1" };
    details.views = [{ state: "frozen", ySplit: 1 }];
    details.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const status = String(row.getCell(8).value ?? "");
      const color = status === "RED" ? "FFFCE8E6" : status === "AMBER" ? "FFFFF4CE" : status === "GREEN" ? "FFE6F4EA" : "FFEAF0F5";
      row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
      row.getCell(8).font = { bold: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="KRI_Analyzed_Results.xlsx"',
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({ detail: error instanceof Error ? error.message : "Unable to generate the analyzed Excel workbook." }, { status: 422 });
  }
}
