# Group B — KRI Management System

A Next.js demonstration application for the Head Office KRI process. The application is designed to demonstrate the workflow from reporting-cycle initiation through departmental submission, ORMD review, threshold-based risk assessment and PDF management reporting.

## Run the application locally

Requirements: Node.js 22 or later.

```bash
git clone https://github.com/Salim3467/Group-B.git
cd Group-B/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Select **Open KRI workspace** from the dashboard.

## Demonstration workflow

1. Open **Collection** and set the reporting period and cycle start date.
2. Select whether the quarterly HR submission is due in this cycle.
3. Select **Create cycle & issue requests**. Request issuance is logged as a simulation; no email is sent.
4. Open each department submission and enter values against the source-template indicators.
5. Submit each completed department return to ORMD.
6. Open **Review queue**, enter review comments and approve or return each submission.
7. Open **KRI inventory** to review appetite/tolerance values and the threshold approval flag.
8. Open **Reports** to view the approved KRI position, export approved results to CSV and generate the analytical PDF.
9. Open **Activity log** to show the request, reminder, submission, review and report events.

Suggested synthetic values for a demo:
- IT downtime hours: 1.5, 3.5, 6, 1, 4.
- Digital Banking downtime hours: 0.5, 2.5, 5.5, 1.2, 3.
- HR employee turnover: 8.5%, 11%, or 13% (one value per quarterly submission).

## Source material

- [Process flow](Process-Flow.md)
- [IT monthly KRI template](IT.csv)
- [Digital Banking monthly KRI template](Digi.csv)
- [HR quarterly KRI template](HR.csv)

The KRI inventory uses the indicators represented in these templates. IT and Digital Banking threshold values shown in the demo are illustrative only. The HR template records Green below 10%, Amber above 10% to 12%, and Red above 12%; exactly 10% is not explicitly classified in the source and is flagged as a threshold gap.

## Prototype boundaries — important

- This is a demonstration prototype, not a production banking system.
- Browser local storage is used; data is local to one browser and is not shared centrally between departments or users.
- Request emails and reminders are simulated and recorded in the activity log. SMTP/email dispatch and automatic scheduled reminders are not connected.
- Sample thresholds are not approved bank thresholds. The threshold confirmation checkbox is a demonstration control only and does not constitute formal approval.
- The due-date helper excludes weekends but does not apply Nepal public holidays. Confirm the applicable Nepali calendar and official working-day calendar before operational use.
- Authentication, role-based access, central database, maker-checker controls, immutable audit trail, attachment/evidence handling, backups, retention, security testing and approved hosting are not implemented.
- Use synthetic data only. Do not enter confidential or live bank information.

## Current technical design

- Next.js 15 / React 19 / TypeScript.
- Browser-local prototype data for workflow demonstration.
- CSV/XLSX inspection and PDF generation APIs are available under `frontend/src/app/api/kri`.
- PDF generation uses the existing Node.js PDFKit implementation.
- See [system architecture and phase plan](docs/KRI_SYSTEM_ARCHITECTURE_AND_PHASE1.md).
