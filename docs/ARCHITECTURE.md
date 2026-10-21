# Architecture

```
backend/
  migrations/        versioned SQL (applied once, in order, by scripts/migrate.js)
  src/
    config/          env validation (zod), permission matrix (single source of truth)
    db/              mysql2 pool, withTransaction()
    middleware/      auth (JWT cookie), permissions, CSRF header, subscription guard, errors, validation
    validation/      zod schemas (untrusted input)
    services/        business logic + SQL (parameterized); financialCalculations/summaryBuilder are pure
    controllers/     thin HTTP adapters
    routes/          route tables with permission + validation per endpoint
  tests/unit/        no database needed
  tests/integration/ need MySQL (cross-tenant, roles, payments, reports, subscription)
frontend/
  src/theme/         ThemeProvider (light/dark/system, persisted), ThemeToggle, pure resolveTheme
  src/styles/        tokens.css (all colors as CSS variables for both themes)
  src/components/ui  reusable primitives; charts/ uses the same tokens
  src/pages/         one page per module
```

## Multi-tenancy
- Company comes **only** from the verified session (`req.auth.companyId`), never from request data.
- Every tenant query includes `company_id = ?`; list queries enforce it in `utils/listQuery.js`.
- Cross-table references use **composite foreign keys** `(company_id, id)` so a row cannot reference another tenant's row at the database level.
- Foreign IDs in request bodies are verified with `assertOwned()`; cross-tenant and missing records both return 404/400 identically.

## Auth & sessions
- bcrypt password hashing; JWT in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production).
- `token_version` on the user row invalidates sessions on role change, disable, or "log out everywhere".
- State-changing requests require `X-Requested-With: bp-crm` (CSRF defence) and CORS is limited to `CLIENT_ORIGIN`.
- Login/register are rate limited; failed and successful logins are audited; unknown emails and wrong passwords are indistinguishable.

## Roles (least privilege) — see `backend/src/config/permissions.js`
- **CEO/COO:** dashboards, all reports/exports, users, subscription, targets, investments, full audit trail. Cannot record payments/expenses.
- **Finance:** invoices (issue/void), payments/refunds, expenses, investments, financial reports/exports, financial audit entries. Cannot manage users or CRM data.
- **Sales:** customers, leads, opportunities, quotations, draft invoices, own targets/performance. No payments, expenses, investments, or company financials.

## Subscription
Plans with user/customer/invoice limits; status `trialing | active | past_due | suspended | canceled | expired`.
New companies start a 14-day trial. There is no payment gateway: `active` is reached only by an explicit, audited transition.
Inactive subscriptions are read-only (writes return 402) but data stays visible and the owner can reactivate.
