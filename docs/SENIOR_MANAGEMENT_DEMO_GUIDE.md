# Senior Management Demonstration Guide — KRI Management System

## Purpose of the demonstration

Show how the proposed application can coordinate Head Office KRI collection, track reporting compliance, capture departmental values, support ORMD review, assess risk against appetite/tolerance and produce a consolidated PDF report.

## Before the meeting

1. Clone or pull the latest `main` branch.
2. Run the application from the `frontend` folder using `npm install` and `npm run dev`.
3. Open `http://localhost:3000` in a browser.
4. Use only synthetic demonstration data. Do not enter actual bank information.
5. If the browser contains old demo data, use **Reset demo data** in the KRI workspace sidebar.

## Suggested 8–10 minute walkthrough

### 1. Dashboard — explain the process (1 minute)

Open the dashboard and explain that the workspace brings collection, review, risk assessment and reporting together.

### 2. Initiate the reporting cycle (1 minute)

- Open **Monthly collection** / **Collection**.
- Enter a reporting period label, for example `2083/08`.
- Select the Gregorian equivalent of the first day of the Nepali reporting month as the cycle start date.
- Leave **Include quarterly HR submission** selected for this walkthrough.
- Select **Create cycle & issue requests**.

Explain that the prototype records the request workflow. Actual email dispatch is not connected.

### 3. Demonstrate department submission (2–3 minutes)

Open each department row and enter synthetic values. All listed values are required before submission.

**Information Technology — downtime hours**

| Indicator | Demo value |
|---|---:|
| Core Banking System downtime | 1.5 |
| SWIFT downtime | 3.5 |
| Email downtime | 6 |
| Overall Data Centre downtime | 1 |
| ATM downtime | 4 |

**Digital Banking — downtime hours**

| Indicator | Demo value |
|---|---:|
| Mobile Banking downtime | 0.5 |
| Internet Banking downtime | 2.5 |
| e@nabil downtime | 5.5 |
| corporatePAY downtime | 1.2 |
| ATM downtime | 3 |

For each IT / Digital Banking indicator, also select whether downtime occurred and enter a sample location/remarks if useful.

**Human Resources — quarterly employee turnover**

- Enter `11` as the illustrative percentage value.

Select **Submit to ORMD for review** for each department.

### 4. Demonstrate ORMD review (1 minute)

- Open **Review queue**.
- Review the submitted KRI values and calculated status.
- Enter a brief review comment.
- Select **Approve submission** for each department.

The management report includes only ORMD-approved submissions.

### 5. Demonstrate KRI inventory and thresholds (1 minute)

Open **KRI inventory** and show:
- Department-wise KRI inventory derived from the IT, Digital Banking and HR templates.
- Appetite/tolerance fields and risk direction.
- Threshold approval flag.

Important: IT and Digital Banking limits shown in the demo are provisional training bands, not approved. The HR source indicates Green below 10%, Amber above 10% through 12%, and Red above 12%; the prototype provisionally treats exactly 10% as Amber because the source leaves that boundary undefined. Do not describe any demonstration limit as formally approved.

### 6. Generate the management report (1 minute)

Open **Reports**:
- Show the approved KRI position.
- Generate the analytical PDF.
- Export the approved KRI data to CSV if required.

Explain that the report uses the values and limits currently configured in the demo and must be validated before circulation.

### 7. Show the activity log (30 seconds)

Open **Activity log** to demonstrate traceability of simulated requests, reminders, submissions, reviews and report generation.

## Key points to communicate to senior management

- One workflow for monthly IT and Digital Banking and quarterly HR KRI collection.
- Visibility over departmental submissions, due dates, reminder counts and overdue follow-up.
- Standardized KRI data capture and ORMD review.
- Consistent Green / Amber / Red assessment against configured thresholds.
- Consolidated management reporting and downloadable PDF output.
- A foundation that can be extended to bank-wide KRI ownership and reporting.

## Current prototype limitations

The demonstration is not a production implementation:
- Request and reminder emails are simulated; no email is sent.
- Reminder dates are displayed and reminders are manually triggered; there is no background scheduler.
- Data is stored in the current browser only; there is no central database or multi-user sharing.
- Authentication, role-based permissions, formal maker-checker controls and immutable audit trails are not implemented.
- Thresholds are illustrative until confirmed against approved bank methodology.
- The date helper excludes weekends but does not apply Nepal public holidays.
- No confidential or live bank data should be entered.

## Decisions needed for the production phase

Obtain approval for the KRI inventory, threshold bands, HR formula, reporting calendar, quarter-end months, email routing, escalation matrix, user roles, central data store, security architecture, retention and hosting. Production implementation should follow the bank's IT, information security, privacy and change-management approval processes.
