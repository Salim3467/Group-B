import { NextRequest, NextResponse } from "next/server";
import { inspectDataset } from "@/lib/kri";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ detail: "Select a CSV or Excel file." }, { status: 400 });
    const filename = file.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(filename)) return NextResponse.json({ detail: "Upload a CSV or Excel file (.csv, .xlsx, .xls)." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ detail: "File size must not exceed 10 MB." }, { status: 413 });
    const result = inspectDataset(Buffer.from(await file.arrayBuffer()), filename);
    if (!result.data_rows) return NextResponse.json({ detail: "The uploaded dataset has no data rows." }, { status: 422 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ detail: error instanceof Error ? error.message : "Could not inspect this dataset." }, { status: 422 });
  }
}
