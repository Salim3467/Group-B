import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { normalizeDataset } from "@/lib/kri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ detail: "Select a CSV or Excel file." }, { status: 400 });
    const filename = file.name.toLowerCase();
    if (!/\.(csv|xlsx)$/.test(filename)) return NextResponse.json({ detail: "Upload a CSV or Excel file (.csv, .xlsx)." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ detail: "File size must not exceed 10 MB." }, { status: 413 });
    const rows = await normalizeDataset(Buffer.from(await file.arrayBuffer()), filename);
    const counts = { GREEN: 0, AMBER: 0, RED: 0 };
    rows.forEach(row => counts[row.RAG_Status as keyof typeof counts]++);
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 34, bufferPages: true, info: { Title: "Key Risk Indicator Report", Author: "KRI Management System" } });
    const chunks: Buffer[] = [];
    doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
    const completed = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
    const navy = "#15364d";
    doc.font("Helvetica-Bold").fontSize(18).fillColor(navy).text("KEY RISK INDICATOR (KRI) REPORT", { align: "center" });
    doc.moveDown(0.3).font("Helvetica").fontSize(9).fillColor("#52616b").text("Generated: " + new Date().toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" }) + " (Nepal time)", { align: "center" });
    doc.moveDown(1);
    const summaryY = doc.y;
    const summary = [["TOTAL KRIs", "GREEN", "AMBER", "RED"], [String(rows.length), String(counts.GREEN), String(counts.AMBER), String(counts.RED)]];
    const boxWidth = 175;
    summary[0].forEach((label, i) => {
      const x = 34 + i * (boxWidth + 8);
      doc.roundedRect(x, summaryY, boxWidth, 42, 5).fill("#f0f4f7");
      doc.fillColor("#536575").font("Helvetica-Bold").fontSize(8).text(label, x + 8, summaryY + 7, { width: boxWidth - 16, align: "center" });
      doc.fillColor(navy).fontSize(15).text(summary[1][i], x + 8, summaryY + 20, { width: boxWidth - 16, align: "center" });
    });
    doc.y = summaryY + 58;
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text("Department-wise risk position");
    const departments = [...new Set(rows.map(r => r.Department))];
    departments.forEach(department => {
      const group = rows.filter(r => r.Department === department);
      const c = { GREEN: 0, AMBER: 0, RED: 0 };
      group.forEach(r => c[r.RAG_Status as keyof typeof c]++);
      doc.font("Helvetica").fontSize(8).fillColor("#253746").text(`${department}: ${group.length} total  |  Green ${c.GREEN}  |  Amber ${c.AMBER}  |  Red ${c.RED}`);
    });
    doc.moveDown(0.8);
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(12).text("KRI details");
    const columns = [
      { title: "KRI", x: 34, w: 150 }, { title: "Department", x: 188, w: 112 },
      { title: "Period", x: 304, w: 68 }, { title: "Actual", x: 376, w: 62 },
      { title: "Green", x: 442, w: 62 }, { title: "Red", x: 508, w: 62 },
      { title: "Direction", x: 574, w: 65 }, { title: "Status", x: 643, w: 70 }
    ];
    const drawHeader = () => {
      const y = doc.y;
      doc.rect(34, y, 679, 22).fill(navy);
      columns.forEach(col => doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5).text(col.title, col.x + 3, y + 7, { width: col.w - 6, lineBreak: false }));
      doc.y = y + 27;
    };
    drawHeader();
    rows.forEach((row, index) => {
      const height = 21;
      if (doc.y + height > 550) { doc.addPage(); drawHeader(); }
      const y = doc.y;
      if (index % 2 === 0) doc.rect(34, y - 3, 679, height).fill("#f4f7f9");
      const values = [row.KRI, row.Department, row.Period, row.Actual.toLocaleString(), row.Green_Limit.toLocaleString(), row.Red_From.toLocaleString(), row.Direction, row.RAG_Status];
      columns.forEach((col, i) => {
        const color = i === 7 ? (row.RAG_Status === "RED" ? "#b42318" : row.RAG_Status === "AMBER" ? "#9a6700" : "#137547") : "#263746";
        doc.fillColor(color).font(i === 7 ? "Helvetica-Bold" : "Helvetica").fontSize(7.2).text(String(values[i]), col.x + 3, y + 3, { width: col.w - 6, height: 15, ellipsis: true, lineBreak: false });
      });
      doc.y = y + height;
    });
    doc.moveDown(1);
    if (doc.y > 520) doc.addPage();
    doc.fillColor(navy).font("Helvetica-Bold").fontSize(11).text("Key risk observations");
    rows.filter(r => r.RAG_Status !== "GREEN").forEach(row => {
      const delta = row.Direction === "HIGHER" ? row.Actual - row.Green_Limit : row.Green_Limit - row.Actual;
      doc.fillColor("#263746").font("Helvetica").fontSize(8).text(`${row.RAG_Status}: ${row.KRI} (${row.Department}) — actual ${row.Actual}; ${Math.abs(delta).toLocaleString()} from the green limit; red threshold ${row.Red_From}.`);
    });
    doc.moveDown(0.5).fillColor("#647482").font("Helvetica-Oblique").fontSize(7).text("Assessment uses the thresholds supplied in the uploaded dataset. Confirm all thresholds and risk directions against the bank-approved KRI methodology before management use.");
    doc.end();
    const pdf = await completed;
    return new NextResponse(new Uint8Array(pdf), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="KRI_Report.pdf"', "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ detail: error instanceof Error ? error.message : "Unable to generate the report." }, { status: 422 });
  }
}
