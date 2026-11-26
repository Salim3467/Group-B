# KRI Management System

A lightweight, browser-based Key Risk Indicator (KRI) prototype built with **Node.js and Next.js**.

## Minimal setup

Requirements: Node.js 20.9 or later (Node.js 22 LTS recommended).

```bash
git clone https://github.com/Salim3467/Group-B.git
cd Group-B/frontend
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

For a production build:

```bash
npm run build
npm start
```

## Architecture

- One Node.js / Next.js application serves the browser interface and API routes.
- No Docker, Python, FastAPI, PostgreSQL, or separate database is required.
- CSV and Excel files are parsed in memory.
- KRI inspection, column recognition, risk classification and PDF generation run in Node.js API routes.
- The monthly workspace saves its prototype entries in the current browser's local storage only.
- Uploaded datasets are not written to disk or retained by the server.

## KRI PDF report generator

Open `/kri-report`, upload a CSV or Excel workbook, review the automatically detected column mapping, and generate a PDF.

API routes:
- `GET /api/kri/template` — sample CSV template.
- `POST /api/kri/inspect` — detects the heading row and recognised fields.
- `POST /api/kri/report` — validates the data and returns a PDF.

Required fields: KRI, Department, Period, Actual, Green Limit and Red Threshold. Common alternatives such as Indicator, Risk Metric, Unit, Division, Reporting Month, Actual Value, Result, Green Threshold and Red From are recognised. Optional Direction defaults to HIGHER; supported values are HIGHER and LOWER.

For HIGHER indicators, values at or below Green Limit are Green, values at or above Red Threshold are Red, and values between are Amber. For LOWER indicators, the reverse applies. Thresholds are used exactly as supplied and must be confirmed against the bank-approved KRI methodology.

Limits: 10 MB upload and 5,000 data rows. Supported formats: CSV and XLSX.

## Important limitations

This is a development prototype, not a production bank system. There is no central database, authentication, user/department access control, approval workflow, audit trail, central historical record or automated reminder service. Browser local storage is specific to one browser profile and device and can be cleared by the user. Do not enter confidential or live bank data.

Before any production use, the bank's IT/security teams must approve hosting, access controls, data classification, retention, logging, backups, and security testing. A database can be deliberately added later only if central multi-user persistence becomes a confirmed requirement.
