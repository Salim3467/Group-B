# KRI Management System

An online Key Risk Indicator collection, review and reporting portal for Head Office departments, Risk Management and Senior Management.

## Requirements baseline

- [Original AI-Enabled KRI Framework](./AI_Enabled_KRI_Framework%20(1).md)
- [System Architecture and Phase 1 Plan](./docs/KRI_SYSTEM_ARCHITECTURE_AND_PHASE1.md)

The framework's target workflow is: automated KRI request → department submission → validation and capture → approved threshold assessment → RAG dashboard → AI-assisted commentary → escalation and RCA/CAP tracking → future ORMSS integration.

## Current repository status

The repository currently contains the initial application foundation:
- Next.js frontend shell
- FastAPI backend
- PostgreSQL connection and initial SQLAlchemy data entities
- Docker Compose development environment
- Environment-variable template

This is **not yet a complete or production-ready system**. Authentication, operational APIs, submission workflows, email scheduling, threshold/RAG logic, AI extraction, management reports and ORMSS integration remain to be implemented and tested.

## KRI PDF report generator (first working module)

The application now includes a dataset upload page at `/kri-report` and API endpoints:
- `GET /kri/template` downloads a sample CSV.
- `POST /kri/report` accepts a CSV or Excel file and returns a PDF report.

Required columns: `KRI`, `Department`, `Period`, `Actual`, `Green_Limit`, `Red_From`. Optional `Direction` is `HIGHER` (default) or `LOWER`. For HIGHER, values at/below Green_Limit are Green and at/above Red_From are Red. For LOWER, values at/above Green_Limit are Green and at/below Red_From are Red. Values between the limits are Amber. This first module processes the file in memory and does not save uploaded data.

## Run the development foundation

1. Install Docker Desktop.
2. Clone this repository.
3. Copy .env.example to .env.
4. Change the local database password in .env consistently in POSTGRES_PASSWORD and DATABASE_URL.
5. Start the services:

   ```bash
   docker compose up --build
   ```

6. Open:
   - Frontend: http://localhost:3000
   - API health: http://localhost:8000/health
   - API readiness: http://localhost:8000/ready
   - API documentation: http://localhost:8000/docs

To stop the services, run docker compose down. To also remove the local development database volume, run docker compose down -v (this permanently deletes local database data).

## Development and security notes

- Use synthetic test data only during development.
- Do not commit .env, credentials, API keys, bank data or customer information.
- Do not expose the development services publicly.
- The current schema bootstrap uses SQLAlchemy create_all for development only. Production must use versioned database migrations.
- Production deployment requires bank IT/security approval, approved hosting and data-residency arrangements, HTTPS, managed secrets, access controls, private file storage, backups and security testing.

## Planned end-to-end delivery

1. Authentication, user roles and department-level authorization.
2. Department, KRI inventory and assignment administration.
3. Monthly reporting periods and task generation.
4. Submission forms, validation, attachments and version history.
5. Department Head and Risk Management review workflow.
6. Scheduled reminders, escalation and notification logs.
7. Operational dashboard, exports and management views.
8. Approved threshold configuration and deterministic RAG assessment.
9. RCA/CAP workflow and AI-assisted extraction/commentary.
10. ORMSS integration and unified Branch + Head Office reporting.

See the architecture document for the detailed functional requirements and acceptance checklist.
