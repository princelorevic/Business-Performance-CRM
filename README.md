# Business Performance CRM SaaS

Multi-tenant CRM with finance, ROI and an executive dashboard.
**Stack:** React + Vite + Tailwind (JavaScript) · Node.js + Express (JavaScript) · MySQL 8.

> **Status:** code-complete for the defined scope, but see [Known limitations](#known-limitations) —
> the frontend build and database-backed tests were **not executed** in the environment that generated this project.

## Requirements
Node.js 20+, MySQL 8.0+ (uses CHECK constraints and JSON).

## Setup
```bash
# 1. Database
mysql -u root -p -e "CREATE DATABASE bp_crm CHARACTER SET utf8mb4; CREATE USER 'bp_crm'@'localhost' IDENTIFIED BY '<choose-a-password>'; GRANT ALL ON bp_crm.* TO 'bp_crm'@'localhost';"

# 2. Backend
cd backend
cp .env.example .env        # fill in DB_* and a random JWT_SECRET (see comment in the file)
npm install
npm run migrate             # creates schema + seeds plans
npm run dev                 # http://localhost:4000

# 3. Frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :4000)
```
Open http://localhost:5173/register to create a company (you become the CEO/COO owner), then add Finance and Sales users from **Team**.

## Tests
```bash
cd backend  && npm run test:unit     # no database needed
cd backend  && npm test              # also runs integration tests when DB_* and JWT_SECRET are set in the environment
cd frontend && npm test              # pure logic tests (node) + component/journey tests (vitest)
```
Use a **separate, disposable database** for integration tests (they create companies and users). Load it with e.g.
`set -a; . ./.env; set +a` before `npm test`. Without database variables, integration tests are reported as skipped.

## Docs
- [Financial rules](docs/FINANCIAL_RULES.md) — definitions and reporting assumptions
- [Architecture & security model](docs/ARCHITECTURE.md)

## Security notes
- Secrets come from environment variables only; `.env` is git-ignored; `.env.example` has placeholders.
- Before any real deployment: serve over HTTPS, set `NODE_ENV=production`, use a strong `JWT_SECRET`, restrict `CLIENT_ORIGIN`,
  use a least-privilege DB user, and add backups, monitoring and an independent security review.
  Running locally does **not** make this production-secure.

## Known limitations
- **Not verified here:** the sandbox that generated this code could not reach the npm registry, so `npm install`, the Vite build,
  frontend tests (vitest) and all MySQL integration tests were **never executed**. Verified: backend unit tests (55) and frontend pure-logic tests (7) passed; every backend and frontend source file passes a syntax/JSX parse check. Nothing else was run.
  Expect to fix small issues on first run. No `package-lock.json` is included; run `npm install` to generate one.
- No payment gateway; subscription status changes are manual and audited.
- Management reporting only (single currency per company, no tax, no double-entry accounting).
- Invoices are a single total (no line items); no file uploads; no email sending; no password reset flow.
- Customer picker loads the first 100 customers (no search-as-you-type yet). Pipeline is a table, not a drag-and-drop board.
- Exports are CSV only and require a plan with the `exports` feature (Starter has it disabled).
- Auth rate limiting is in-memory (per process); use a shared store when running multiple instances.
