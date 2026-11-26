# KRI Management System — Lightweight Architecture

## Runtime and setup

The prototype is a single **Node.js 22 + Next.js** application. The browser UI and server-side API routes run together in one process.

No Docker, Python, FastAPI, PostgreSQL, or separate database is used.

```bash
git clone https://github.com/Salim3467/Group-B.git
cd Group-B/frontend
npm install
npm run dev
```

Open http://localhost:3000.

## Current capabilities

- Dashboard prototype with clearly labelled synthetic sample data.
- Monthly KRI workspace with browser-local storage for prototype entries.
- CSV/XLSX upload and automatic column-name recognition.
- Header-row detection within the first ten rows.
- Dataset inspection and mapping preview before report generation.
- Deterministic Green / Amber / Red classification using supplied limits and HIGHER/LOWER direction.
- PDF generation through Node.js; uploaded data is processed in memory and not persisted by the server.

API routes: `GET /api/kri/template`, `POST /api/kri/inspect`, and `POST /api/kri/report`.

## Data and persistence boundary

There is deliberately no central database in this release. The upload/report flow is stateless. Monthly workspace entries are stored in the user's browser local storage and are not shared across users, browsers, or devices. Clearing browser storage removes those prototype entries. This is not suitable for authoritative historical records or multi-user departmental workflows.

If the system later needs shared users, approval history, audit logs, centrally retained submissions or cross-device access, persistence and an approved data store will need to be designed as a separate, explicit phase. Do not quietly rely on local browser storage for regulated records.

## Functional roadmap

1. Confirm the KRI inventory, reporting fields, thresholds and owners.
2. Add authentication and department-level access controls using the bank's approved identity provider.
3. Define whether centrally shared records are required before selecting any persistence layer.
4. Implement submission, review/return/approval workflow and audit trail.
5. Add reminders, escalation and management reporting.
6. Add AI-assisted extraction and commentary only after deterministic controls and source-data quality are established.
7. Complete security, privacy, retention, resilience and hosting reviews before production.

## Risk and security notes

- This is a development prototype, not an approved bank production system.
- Do not upload confidential or live bank data without explicit IT/security approval.
- Thresholds in uploaded files are not independently validated; confirm them against formally approved KRI methodology.
- Server uploads are limited to 10 MB and 5,000 data rows.
- Uploaded files are processed in memory and not written to disk.
- Any future multi-user release needs authentication, authorization, secure hosting, auditability, retention rules and approved storage.
