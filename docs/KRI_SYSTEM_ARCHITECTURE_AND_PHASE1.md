# KRI Management System
## System Architecture and Phase 1 Development Plan

Repository: `Salim3467/Group-B`  
Deployment direction: Online web application  
Initial user groups: Head Office departments, Risk Management team, Senior Management

---

## 1. Purpose and scope

The KRI Management System will centralize the monthly collection, review, monitoring and reporting of Key Risk Indicator (KRI) information from Head Office departments. It will reduce manual email follow-ups, improve submission discipline, maintain a historical record and provide management with a consolidated view of operational risk.

The first release (Phase 1) focuses on process automation and reliable data collection. Advanced AI extraction, predictive analytics and ORMSS integration are later phases.

## 2. User roles and access

| Role | Permissions |
|---|---|
| Department Submitter | View KRIs assigned to their department; create and edit draft monthly submissions; attach supporting evidence; submit for review; respond to returned submissions |
| Department Head | View department submissions; review and approve or return submissions; provide comments; view department-level status |
| Risk Management Admin | Manage users, departments, KRI inventory, reporting periods, assignments and approved workflow settings |
| Risk Management Reviewer | View all department submissions; perform completeness checks; validate and accept or return submissions; monitor overdue items |
| Senior Management | Read-only access to consolidated dashboard, department status, approved reports and risk summaries |

Access must be enforced by the backend, not merely hidden in the user interface. Users must only access data permitted by their role and department scope.

## 3. Proposed application architecture

### Presentation layer
A responsive browser-based portal with:
- Secure sign-in and role-aware navigation
- Department KRI workspace
- Risk Management administration and monitoring workspace
- Senior Management read-only dashboard

### Application/API layer
A Python FastAPI backend exposing authenticated APIs for:
- User and role administration
- Department and KRI master data
- Reporting periods and KRI assignments
- Monthly submission and attachment workflows
- Review, approval and return actions
- Reminder and notification scheduling
- Audit history and reporting

### Data layer
PostgreSQL will store structured records. Supporting files will be stored in controlled file storage, with file metadata and access permissions held in the database.

### Notification layer
Email notifications will be generated for:
- New reporting-period requests
- Submission acknowledgements
- Approaching deadlines and overdue submissions
- Returned submissions requiring correction
- Department Head and Risk Management review actions

Notification delivery must be logged. Phase 1 should support configurable schedules rather than hard-coding dates in application logic.

### Proposed technology stack
- Frontend: Next.js / React
- Backend: Python FastAPI
- Database: PostgreSQL
- Authentication: secure session/token-based authentication with role-based access control
- File storage: private object storage or an equivalent protected storage service
- Deployment: cloud-hosted web application with HTTPS
- Source control: GitHub repository Group-B

The stack is a proposal and should be confirmed against the bank's approved technology, hosting, security and data-residency requirements before production deployment.

## 4. Core data model

| Entity | Key information |
|---|---|
| User | Name, email, role, department, active status |
| Department | Department name, department code, Department Head |
| KRI | KRI code, name, definition, unit, frequency, calculation method, owner department, active status |
| KRI Assignment | KRI, department, responsible submitter, effective period |
| Reporting Period | Period identifier, start date, due date, status |
| KRI Submission | KRI, department, period, reported value, narrative, submitter, submission timestamp, workflow status |
| Attachment | Submission reference, file name, storage reference, uploader, timestamp |
| Review | Submission reference, reviewer, decision, comments, timestamp |
| Notification | Recipient, type, related period/submission, sent status, timestamp |
| Audit Log | Actor, action, record type, record identifier, before/after details, timestamp |

Monthly submissions must be retained as separate historical records. A later month's value must never overwrite an earlier month's submission.

Thresholds and RAG configuration should be added as controlled master data in the analytics phase. Only authorized Risk Management users should maintain them, with a full audit trail and formal approval process.

## 5. Phase 1 functional modules

### Module 1 — Authentication and user administration
- Sign-in and sign-out
- Role-based permissions
- Department-based access restrictions
- User activation/deactivation
- Administrative user assignment

### Module 2 — Department and KRI master
- Create and maintain departments
- Create and maintain KRI records
- Assign KRIs to departments
- Record KRI definitions, units, frequency and reporting instructions
- Activate/deactivate records without deleting historical submissions

### Module 3 — Reporting period management
- Create monthly reporting periods
- Set opening and due dates
- Generate department-specific KRI tasks from active assignments
- Track period status: Draft, Open, Due, Closed

### Module 4 — Department submission portal
- Display only the department's assigned KRIs
- Capture reporting value, reporting notes and supporting evidence
- Validate mandatory fields and permitted data types
- Save drafts
- Submit a completed reporting package
- Show acknowledgement and submission history

### Module 5 — Review and approval workflow
Recommended Phase 1 workflow:

1. Department Submitter prepares and submits the monthly KRI return.
2. Department Head reviews and approves or returns it for correction.
3. Risk Management Reviewer performs completeness and reasonableness checks.
4. Risk Management records acceptance or returns the submission with comments.
5. Senior Management can view the consolidated status and accepted information.

Workflow status values:
- Not Started
- Draft
- Submitted
- Department Review
- Returned to Department
- Risk Review
- Accepted
- Overdue

A returned submission must retain its previous versions and review comments.

### Module 6 — Reminder and escalation management
- Configurable reminder schedule
- Automated reminders to outstanding departments
- Escalation to Department Head after the due date
- Risk Management view of pending and overdue returns
- Notification history and delivery status

The proposed initial schedule from the framework is:
- 10th: first reminder
- 13th: second reminder
- 15th: final reminder
- After due date: escalation to Department Head

These dates should be configurable by reporting period and confirmed by Risk Management.

### Module 7 — Phase 1 monitoring and reports
- Department-wise submission status
- KRI-wise submission status
- Submitted, pending, returned and overdue counts
- Submission register with filters by department and period
- Export to Excel/CSV
- Senior Management read-only summary

Phase 1 reporting is operational reporting. Automated RAG scoring, risk trend analysis and AI commentary are reserved for Phase 2/3.

### Module 8 — Audit trail
Record user, timestamp, action and affected record for:
- User and role changes
- KRI master changes
- Submission creation and edits
- Submission, return and approval actions
- Attachment uploads
- Reporting-period and reminder configuration changes

## 6. Phase 1 workflow

1. Risk Management creates the monthly reporting period.
2. The system generates KRI tasks for each assigned department.
3. Department Submitters receive email notification and sign in.
4. Departments enter KRI values and upload supporting evidence.
5. Department Submitters submit the return.
6. Department Heads review and approve or return it.
7. Risk Management performs completeness review and accepts or returns it.
8. The portal updates submission compliance and overdue reports.
9. Senior Management views the consolidated read-only status.

## 7. Phase 1 development sequence

| Work package | Deliverables | Completion criteria |
|---|---|---|
| 1. Requirements and controls | Confirm fields, roles, workflow, deadlines and security requirements | Risk Management signs off the Phase 1 requirements |
| 2. Project foundation | Frontend/backend structure, configuration, database connection, environment setup | Application starts locally and health checks pass |
| 3. Identity and access | Login, roles, department scoping, protected APIs | Each role can access only authorized functions and records |
| 4. Master data | Department, user, KRI and assignment screens/APIs | Admin can create, edit, assign and deactivate master records |
| 5. Reporting cycle | Period creation and monthly task generation | Active KRI assignments create the correct department tasks |
| 6. Submission workflow | Draft, validation, attachments, submit, return and review | Complete submission can move through the agreed workflow |
| 7. Notifications | Email templates, reminders, escalation and delivery log | Test notifications are sent and logged at configured times |
| 8. Monitoring and reports | Operational dashboard, filters and export | Counts reconcile with underlying submission records |
| 9. Testing and pilot | Role tests, workflow tests, security checks and pilot feedback | No critical defects; pilot users complete a monthly cycle |
| 10. Deployment readiness | HTTPS, backups, secrets, monitoring and deployment guide | Approved hosting and operational controls are in place |

## 8. Phase 1 acceptance checklist

- [ ] Three user groups can sign in with appropriate permissions.
- [ ] Department users can see only their department's assigned KRIs.
- [ ] Risk Management can manage KRI and department master data.
- [ ] A monthly reporting period generates the correct tasks.
- [ ] Users can save drafts, submit values and upload evidence.
- [ ] Department Head and Risk Management can review, approve or return submissions.
- [ ] Returned submissions preserve comments and history.
- [ ] Reminders and overdue escalations are configurable and logged.
- [ ] Dashboard totals reconcile with submission records.
- [ ] Senior Management has read-only access to consolidated information.
- [ ] Material changes and workflow actions are captured in audit logs.
- [ ] Backup, access control and secure deployment requirements are documented and tested.

## 9. Security and governance requirements

Because KRI information may contain confidential internal risk data:
- Use HTTPS for all deployed access.
- Store credentials and API keys in managed secrets/environment configuration, never in source control.
- Apply least-privilege role and department access.
- Restrict file types and sizes; validate uploads and store files privately.
- Log important actions and protect audit records from ordinary user modification.
- Implement database backups and a tested restoration procedure.
- Define retention, data classification, hosting and incident-response requirements with the bank's IT/security teams.
- Do not use real bank data in development or testing without explicit authorization and approved safeguards.

## 10. Later phases

### Phase 2 — Risk analytics
- Approved threshold configuration
- Deterministic Green / Amber / Red classification
- KRI trends and heat maps
- Top Red KRIs and exception reporting
- Historical comparison and risk dashboard

### Phase 3 — AI enablement
- Extraction from email and Excel attachments
- Mapping extracted values to KRI records
- AI-generated observations and commentary
- Unusual-value detection and exception suggestions

AI must not independently change approved thresholds or make risk appetite decisions. RAG outcomes must be calculated using approved, deterministic rules.

### Phase 4 — Enterprise integration
- ORMSS integration
- Branch and Head Office KRI consolidation
- Unified enterprise risk dashboard
- Enterprise management reporting

## 11. Decisions required before production build

The following must be confirmed with Risk Management and the bank's IT/security teams:
1. Approved hosting environment and data-residency requirements.
2. Authentication method (bank SSO or portal-managed accounts).
3. Final KRI inventory, department mapping, units and mandatory fields.
4. Whether Department Head approval is mandatory for every department.
5. Final reporting calendar, reminders and escalation recipients.
6. Attachment formats, size limits and retention policy.
7. Required approval and audit controls.

## 12. Recommended Phase 1 boundary

Build a working, secure monthly KRI collection and review portal first. Do not include AI extraction, automated RAG decisions, predictive analytics or ORMSS integration in the first release. This keeps the initial system testable and establishes trustworthy structured data for later analytics.
