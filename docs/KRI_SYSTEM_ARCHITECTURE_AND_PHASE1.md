# KRI Management System — Architecture, Demo Scope and Production Roadmap

## 1. Runtime and setup

The prototype is a single Node.js 22 + Next.js application. Browser UI and server-side API routes run together in one process.

```bash
git clone https://github.com/Salim3467/Group-B.git
cd Group-B/frontend
npm install
npm run dev
```

Open http://localhost:3000.

## 2. Demonstration workflow implemented

The KRI workspace now demonstrates:

1. **Reporting-cycle initiation:** period label, cycle start date and optional quarterly HR inclusion.
2. **Department request tracking:** IT and Digital Banking monthly; HR quarterly. Request events are recorded in the activity log.
3. **Submission monitoring:** request status, due date, next reminder date and reminder count.
4. **Department KRI entry:** actual value, downtime occurrence, location/affected service and remarks, aligned with the supplied IT/Digital Banking fields; HR employee turnover percentage.
5. **Department submission:** validation that all listed KRI values are entered before submission to ORMD.
6. **ORMD review:** approve or return the departmental submission with comments.
7. **KRI inventory:** maintain appetite/tolerance values, risk direction and a demonstration threshold-confirmation flag.
8. **Risk assessment:** Green / Amber / Red using configured values. HR employee turnover follows the supplied classification: Green below 10%, Amber from 10% through 12% for this training prototype, Red above 12%. The source template does not classify exactly 10%; the training choice is provisional.
9. **Management reporting:** approved submissions only; PDF report and CSV export.
10. **Activity log:** request, reminder, submission, review and report-generation events.

The dashboard at / provides a landing page and links into the KRI workspace at /kri-workspace. The separate /kri-report route supports CSV/XLSX upload inspection and PDF report generation.

## 3. Source-data fidelity and threshold governance

- IT template indicators: Core Banking System, SWIFT, Email, Overall Data Centre and ATM downtime.
- Digital Banking template indicators: Mobile Banking, Internet Banking, e@nabil, corporatePAY and ATM downtime.
- HR template indicator: Employee Turnover.
- IT and Digital Banking source templates do not provide approved Green/Amber/Red thresholds. For training, the app provisionally uses below 5 hours for Green, 5 to below 7 for Amber, and 7 or more for Red; these limits are explicitly marked unapproved.
- HR source template indicates a trigger above 10%, Green below 10%, Amber above 10% to 12%, and Red above 12%. The exact 10% boundary is not defined in the source; the training app provisionally classifies exactly 10% as Amber pending confirmation.
- The HR calculation/formula in the source workbook still requires confirmation before production use.

## 4. Prototype persistence and integration boundaries

There is no central database in this release. Workflow entries and activity logs are stored in browser local storage and are not shared across users, browsers or devices. Clearing browser storage removes these demo entries.

Request and reminder actions are simulated. They create activity-log entries but do not send emails. Reminder dates are displayed as a follow-up aid; no background scheduler is connected. The date helper excludes weekends only and does not apply Nepal public holidays.

PDF generation is performed by the existing Node.js API route. The upload/report APIs process uploaded files in memory and do not persist those uploads.

## 5. Production roadmap / required decisions

Before production implementation, the bank should approve and provide:

1. Final KRI inventory, department owners, units, definitions, calculation methods and data sources.
2. Approved Green/Amber/Red thresholds, direction and escalation triggers for every KRI.
3. HR turnover formula and the exact 10% boundary treatment.
4. Nepali reporting calendar, quarter-end months, official holiday calendar, due-date rules and reminder escalation matrix.
5. Department request/response email templates, sender identity, recipients, CC rules and approved email gateway.
6. User roles and access matrix: department preparer, department approver, ORMD reviewer, system administrator and management read-only.
7. Required maker-checker approval, return/resubmission, evidence attachment and audit-log requirements.
8. Approved central data store, retention, backup, disaster recovery and data archival requirements.
9. Bank-approved identity provider, hosting, network zones, secrets management, vulnerability assessment and security sign-off.

Recommended implementation sequence:

- **Phase 1 — Requirements sign-off:** finalize KRI inventory, thresholds, owners, formulas, calendar and escalation rules.
- **Phase 2 — Shared workflow:** authentication, role-based access, central database, submission/review workflow and immutable audit trail.
- **Phase 3 — Communications:** scheduled request/reminder emails and overdue escalation through the bank-approved email service.
- **Phase 4 — Analytics:** historical trends, risk appetite aggregation, exception commentary, drill-down and management PDF packs.
- **Phase 5 — Assurance and rollout:** security testing, UAT, access review, backup/restore test, operational procedures and controlled production deployment.

## 6. Security and use restriction

This is a development demonstration, not an approved bank production system. Use synthetic data only. Do not upload confidential or live bank data. No user authentication, central persistence, role-based access, production email, immutable audit trail or production security controls are implemented.
