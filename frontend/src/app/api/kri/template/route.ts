import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const csv = "KRI,Department,Period,Actual,Green_Limit,Red_From,Direction\nCritical system downtime,Information Technology,Nov 2026,1.5,2,5,HIGHER\nDaily reconciliation completion,Finance,Nov 2026,97,98,95,LOWER\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="KRI_Sample_Template.csv"', "Cache-Control": "no-store" } });
}
