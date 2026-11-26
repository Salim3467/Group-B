from datetime import datetime, timezone
from io import BytesIO, StringIO

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

router = APIRouter(prefix="/kri", tags=["KRI report generator"])

REQUIRED_COLUMNS = ["KRI", "Department", "Period", "Actual", "Green_Limit", "Red_From"]

# Common labels used by departments in different spreadsheet templates.
# Matching is deliberately based on explicit aliases, not guessed from cell values.
COLUMN_ALIASES = {
    "KRI": ["kri", "kri name", "indicator", "indicator name", "key risk indicator", "risk indicator", "risk metric", "metric", "parameter", "measure"],
    "Department": ["department", "department name", "unit", "business unit", "business function", "division", "office", "owner department", "responsible department"],
    "Period": ["period", "reporting period", "reporting month", "month", "month year", "report month", "as of date", "date", "month end"],
    "Actual": ["actual", "actual value", "current value", "reported value", "value", "result", "achieved", "current month value", "observed value"],
    "Green_Limit": ["green limit", "green threshold", "green", "green target", "appetite limit", "tolerance limit", "acceptable limit", "threshold green", "green boundary"],
    "Red_From": ["red from", "red threshold", "red limit", "red", "red trigger", "critical threshold", "breach limit", "threshold red", "red boundary"],
    "Direction": ["direction", "risk direction", "indicator direction", "trend direction", "higher lower", "risk polarity"],
}

def normalize_header(value):
    import re
    text = str(value).strip().lower().replace("%", " percent ")
    return re.sub(r"[^a-z0-9]+", " ", text).strip()

ALIAS_LOOKUP = {
    normalize_header(alias): canonical
    for canonical, aliases in COLUMN_ALIASES.items()
    for alias in aliases
}

def read_dataset(raw, filename):
    """Find the most likely header row in the first ten rows, then read the sheet."""
    reader = pd.read_csv if filename.endswith(".csv") else pd.read_excel
    try:
        preview = reader(BytesIO(raw), header=None, nrows=10)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read the dataset: {exc}") from exc
    best_row, best_score = 0, -1
    for index, row in preview.iterrows():
        mapped = [ALIAS_LOOKUP.get(normalize_header(value)) for value in row if pd.notna(value)]
        score = len(set(value for value in mapped if value))
        if score > best_score:
            best_row, best_score = int(index), score
    if best_score < 4:
        detected = [str(value) for value in preview.iloc[best_row].tolist() if pd.notna(value)]
        raise HTTPException(
            status_code=422,
            detail="Could not confidently identify the column headings. Include clear headings for KRI, Department, Period, Actual, Green threshold and Red threshold. Detected headings: " + ", ".join(detected[:20]),
        )
    try:
        data = reader(BytesIO(raw), header=best_row)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read the dataset using detected header row {best_row + 1}: {exc}") from exc
    data.columns = [str(column).strip() for column in data.columns]
    return data, best_row

def map_columns(data):
    mapped = {}
    conflicts = {}
    for column in data.columns:
        canonical = ALIAS_LOOKUP.get(normalize_header(column))
        if canonical:
            if canonical in mapped:
                conflicts.setdefault(canonical, [mapped[canonical]]).append(str(column))
            else:
                mapped[canonical] = str(column)
    return mapped, conflicts

def normalize_dataset(data):
    mapped, conflicts = map_columns(data)
    if conflicts:
        details = "; ".join(f"{key}: {', '.join(values)}" for key, values in conflicts.items())
        raise HTTPException(status_code=422, detail=f"Multiple columns match the same KRI field ({details}). Please keep only one matching column for each field.")
    missing = [column for column in REQUIRED_COLUMNS if column not in mapped]
    if missing:
        available = ", ".join(str(column) for column in data.columns[:30])
        raise HTTPException(
            status_code=422,
            detail=f"Could not identify required fields: {', '.join(missing)}. Available headings: {available}. Rename the headings using the sample template labels or common alternatives.",
        )
    rename = {source: target for target, source in mapped.items()}
    data = data.rename(columns=rename).copy()
    return data, mapped

@router.post("/inspect")
async def inspect_kri_dataset(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Upload a CSV or Excel file (.csv, .xlsx, .xls).")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size must not exceed 10 MB.")
    data, header_row = read_dataset(raw, filename)
    if data.empty:
        raise HTTPException(status_code=422, detail="The uploaded dataset has no data rows.")
    mapped, conflicts = map_columns(data)
    missing = [column for column in REQUIRED_COLUMNS if column not in mapped]
    return {
        "file_name": file.filename,
        "header_row": header_row + 1,
        "data_rows": int(len(data)),
        "detected_columns": [{"field": field, "source_column": source} for field, source in mapped.items()],
        "missing_fields": missing,
        "optional_direction": mapped.get("Direction", "Defaults to HIGHER"),
        "ambiguous_fields": conflicts,
        "ready": not missing and not conflicts,
        "sample_rows": data.head(3).fillna("").astype(str).to_dict(orient="records"),
    }


def assess(row):
    direction = str(row.get("Direction", "HIGHER")).strip().upper()
    if direction not in ("HIGHER", "LOWER"):
        raise ValueError("Direction must be HIGHER or LOWER.")
    actual = float(row["Actual"])
    green = float(row["Green_Limit"])
    red = float(row["Red_From"])
    if direction == "HIGHER":
        if green >= red:
            raise ValueError("For HIGHER direction, Green_Limit must be lower than Red_From.")
        return "GREEN" if actual <= green else ("RED" if actual >= red else "AMBER")
    if green <= red:
        raise ValueError("For LOWER direction, Green_Limit must be higher than Red_From.")
    return "GREEN" if actual >= green else ("RED" if actual <= red else "AMBER")


@router.post("/report")
async def create_kri_report(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".csv") or filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Upload a CSV or Excel file (.csv, .xlsx, .xls).")
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size must not exceed 10 MB.")
    data, header_row = read_dataset(raw, filename)
    if data.empty:
        raise HTTPException(status_code=422, detail="The uploaded dataset has no rows.")
    if len(data) > 5000:
        raise HTTPException(status_code=413, detail="A maximum of 5,000 KRI rows can be processed at once.")
    data, detected_mapping = normalize_dataset(data)

    data["Actual"] = pd.to_numeric(data["Actual"], errors="coerce")
    data["Green_Limit"] = pd.to_numeric(data["Green_Limit"], errors="coerce")
    data["Red_From"] = pd.to_numeric(data["Red_From"], errors="coerce")
    if data[["Actual", "Green_Limit", "Red_From"]].isna().any().any():
        raise HTTPException(status_code=422, detail="Actual, Green_Limit and Red_From must contain valid numeric values.")
    if data[["KRI", "Department", "Period"]].isna().any().any():
        raise HTTPException(status_code=422, detail="KRI, Department and Period cannot be blank.")

    if "Direction" not in data.columns:
        data["Direction"] = "HIGHER"
    else:
        data["Direction"] = data["Direction"].fillna("HIGHER").replace("", "HIGHER")
    statuses = []
    try:
        for _, row in data.iterrows():
            statuses.append(assess(row))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    data["RAG_Status"] = statuses

    output = BytesIO()
    doc = SimpleDocTemplate(
        output, pagesize=landscape(A4), rightMargin=14 * mm, leftMargin=14 * mm,
        topMargin=13 * mm, bottomMargin=13 * mm,
    )
    styles = getSampleStyleSheet()
    title = ParagraphStyle("KriTitle", parent=styles["Title"], alignment=TA_CENTER, textColor=colors.HexColor("#12344a"))
    story = [
        Paragraph("KEY RISK INDICATOR (KRI) REPORT", title),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%d %b %Y, %H:%M UTC')}", styles["Normal"]),
        Spacer(1, 7 * mm),
    ]

    counts = data["RAG_Status"].value_counts()
    summary = [
        ["Total KRIs", "Green", "Amber", "Red"],
        [str(len(data)), str(int(counts.get("GREEN", 0))), str(int(counts.get("AMBER", 0))), str(int(counts.get("RED", 0)))],
    ]
    summary_table = Table(summary, colWidths=[45 * mm] * 4)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#12344a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f1f5f7")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d7e0e5")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.extend([summary_table, Spacer(1, 7 * mm)])

    # Department-level exposure summary for management review.
    dept = data.groupby("Department")["RAG_Status"].value_counts().unstack(fill_value=0)
    dept_rows = [["Department", "Total", "Green", "Amber", "Red"]]
    for name, values in dept.iterrows():
        dept_rows.append([str(name), str(int(values.sum())), str(int(values.get("GREEN", 0))), str(int(values.get("AMBER", 0))), str(int(values.get("RED", 0)))])
    story.append(Paragraph("Department-wise risk position", styles["Heading2"]))
    dept_table = Table(dept_rows, repeatRows=1, colWidths=[75 * mm, 25 * mm, 25 * mm, 25 * mm, 25 * mm])
    dept_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#12344a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d7e0e5")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([dept_table, Spacer(1, 6 * mm)])
    headers = ["KRI", "Department", "Period", "Actual", "Green limit", "Red from", "Direction", "RAG status"]
    rows = [headers]
    for _, row in data.iterrows():
        rows.append([
            str(row["KRI"]), str(row["Department"]), str(row["Period"]),
            f'{row["Actual"]:,.2f}', f'{row["Green_Limit"]:,.2f}', f'{row["Red_From"]:,.2f}',
            str(row["Direction"]).upper(), str(row["RAG_Status"]),
        ])
    detail_table = Table(rows, repeatRows=1, colWidths=[48 * mm, 35 * mm, 24 * mm, 22 * mm, 25 * mm, 22 * mm, 22 * mm, 25 * mm])
    detail_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#12344a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d7e0e5")),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    rag_colors = {"GREEN": colors.HexColor("#dff3e5"), "AMBER": colors.HexColor("#fff0c2"), "RED": colors.HexColor("#f9dddd")}
    for index, status in enumerate(statuses, start=1):
        detail_style.append(("BACKGROUND", (7, index), (7, index), rag_colors[status]))
        if index % 2 == 0:
            detail_style.append(("BACKGROUND", (0, index), (6, index), colors.HexColor("#f7f9fa")))
    detail_table.setStyle(TableStyle(detail_style))
    story.extend([detail_table, Spacer(1, 5 * mm)])
    story.append(Paragraph("Key risk observations", styles["Heading2"]))
    exceptions = data[data["RAG_Status"].isin(["RED", "AMBER"])].copy()
    if exceptions.empty:
        story.append(Paragraph("No Amber or Red indicators were identified in the submitted dataset for this reporting period.", styles["Normal"]))
    else:
        for _, item in exceptions.sort_values(["RAG_Status", "Department"]).iterrows():
            status = str(item["RAG_Status"])
            if str(item["Direction"]).upper() == "HIGHER":
                gap = float(item["Actual"]) - float(item["Green_Limit"])
                detail = f"Actual is {abs(gap):,.2f} above the appetite limit"
            else:
                gap = float(item["Green_Limit"]) - float(item["Actual"])
                detail = f"Actual is {abs(gap):,.2f} below the appetite limit"
            line = f"<b>{status}: {item['KRI']}</b> ({item['Department']}) — actual {float(item['Actual']):,.2f}; {detail}. Tolerance boundary: {float(item['Red_From']):,.2f}."
            story.append(Paragraph(line, styles["BodyText"]))
            story.append(Spacer(1, 2 * mm))
    story.extend([
        Spacer(1, 3 * mm),
        Paragraph(
            "Assessment method: HIGHER means larger values indicate greater risk; LOWER means smaller values indicate greater risk. "
            "For HIGHER, Green is at or below Green_Limit, Red is at or above Red_From, and values between are Amber. "
            "For LOWER, Green is at or above Green_Limit, Red is at or below Red_From, and values between are Amber. "
            "Thresholds are taken from the uploaded dataset and have not been independently validated. Confirm them against the bank-approved KRI methodology before management use.",
            styles["Italic"],
        ),
    ])
    doc.build(story)
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="KRI_Report.pdf"'},
    )
