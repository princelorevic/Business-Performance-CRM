-- Business Performance CRM SaaS - initial schema (MySQL 8+, InnoDB, utf8mb4)
-- Tenant integrity: every tenant table carries company_id, and cross-table references
-- use composite foreign keys (company_id, id) so a row can never point at another tenant's row.

CREATE TABLE plans (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code          VARCHAR(40)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  max_users     INT UNSIGNED NULL,           -- NULL = unlimited
  max_customers INT UNSIGNED NULL,
  max_invoices_per_month INT UNSIGNED NULL,
  features      JSON NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE companies (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(200) NOT NULL,
  currency    CHAR(3) NOT NULL DEFAULT 'USD',
  timezone    VARCHAR(64) NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE subscriptions (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id          BIGINT UNSIGNED NOT NULL,
  plan_id             INT UNSIGNED NOT NULL,
  status              ENUM('trialing','active','past_due','suspended','canceled','expired') NOT NULL,
  trial_ends_at       DATETIME NULL,
  current_period_start DATE NULL,
  current_period_end  DATE NULL,
  renews_at           DATE NULL,
  canceled_at         DATETIME NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscriptions_company (company_id),
  KEY idx_subscriptions_status (status),
  CONSTRAINT fk_sub_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES plans (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id    BIGINT UNSIGNED NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          ENUM('ceo_coo','finance','sales') NOT NULL,
  is_owner      TINYINT(1) NOT NULL DEFAULT 0,
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  token_version INT UNSIGNED NOT NULL DEFAULT 0,   -- bump to invalidate all sessions
  last_login_at DATETIME NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_company_id (company_id, id),
  KEY idx_users_company_role (company_id, role),
  CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE customers (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(254) NULL,
  phone       VARCHAR(40) NULL,
  address     VARCHAR(500) NULL,
  notes       TEXT NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  deleted_at  DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_company_id (company_id, id),
  KEY idx_customers_company_name (company_id, name),
  KEY idx_customers_company_deleted (company_id, deleted_at),
  CONSTRAINT fk_customers_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_customers_owner FOREIGN KEY (company_id, owner_user_id) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leads (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  email       VARCHAR(254) NULL,
  phone       VARCHAR(40) NULL,
  source      VARCHAR(100) NULL,
  status      ENUM('new','contacted','qualified','unqualified','converted') NOT NULL DEFAULT 'new',
  owner_user_id BIGINT UNSIGNED NULL,
  converted_customer_id BIGINT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_leads_company_id (company_id, id),
  KEY idx_leads_company_status (company_id, status),
  CONSTRAINT fk_leads_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_leads_owner FOREIGN KEY (company_id, owner_user_id) REFERENCES users (company_id, id),
  CONSTRAINT fk_leads_customer FOREIGN KEY (company_id, converted_customer_id) REFERENCES customers (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE opportunities (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(200) NOT NULL,
  stage       ENUM('prospecting','qualification','proposal','negotiation','won','lost') NOT NULL DEFAULT 'prospecting',
  value       DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  expected_close_date DATE NULL,
  owner_user_id BIGINT UNSIGNED NULL,
  closed_at   DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_opps_company_id (company_id, id),
  KEY idx_opps_company_stage (company_id, stage),
  CONSTRAINT chk_opps_value CHECK (value >= 0),
  CONSTRAINT fk_opps_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_opps_customer FOREIGN KEY (company_id, customer_id) REFERENCES customers (company_id, id),
  CONSTRAINT fk_opps_owner FOREIGN KEY (company_id, owner_user_id) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quotations (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  opportunity_id BIGINT UNSIGNED NULL,
  number      VARCHAR(40) NOT NULL,
  issue_date  DATE NOT NULL,
  valid_until DATE NULL,
  total       DECIMAL(15,2) NOT NULL,
  status      ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
  notes       TEXT NULL,
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotes_company_number (company_id, number),
  UNIQUE KEY uq_quotes_company_id (company_id, id),
  CONSTRAINT chk_quotes_total CHECK (total >= 0),
  CONSTRAINT fk_quotes_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_quotes_customer FOREIGN KEY (company_id, customer_id) REFERENCES customers (company_id, id),
  CONSTRAINT fk_quotes_opp FOREIGN KEY (company_id, opportunity_id) REFERENCES opportunities (company_id, id),
  CONSTRAINT fk_quotes_user FOREIGN KEY (company_id, created_by) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoices double as the recorded "sales transaction" for revenue purposes.
CREATE TABLE invoices (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  opportunity_id BIGINT UNSIGNED NULL,
  number      VARCHAR(40) NOT NULL,
  issue_date  DATE NOT NULL,
  due_date    DATE NOT NULL,
  total       DECIMAL(15,2) NOT NULL,
  status      ENUM('draft','sent','partially_paid','paid','overdue','void') NOT NULL DEFAULT 'draft',
  notes       TEXT NULL,
  sold_by     BIGINT UNSIGNED NULL,
  voided_at   DATETIME NULL,
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_company_number (company_id, number),
  UNIQUE KEY uq_invoices_company_id (company_id, id),
  KEY idx_invoices_company_issue (company_id, issue_date),
  KEY idx_invoices_company_status_due (company_id, status, due_date),
  CONSTRAINT chk_invoices_total CHECK (total >= 0),
  CONSTRAINT fk_invoices_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_invoices_customer FOREIGN KEY (company_id, customer_id) REFERENCES customers (company_id, id),
  CONSTRAINT fk_invoices_opp FOREIGN KEY (company_id, opportunity_id) REFERENCES opportunities (company_id, id),
  CONSTRAINT fk_invoices_sold_by FOREIGN KEY (company_id, sold_by) REFERENCES users (company_id, id),
  CONSTRAINT fk_invoices_created_by FOREIGN KEY (company_id, created_by) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE expense_categories (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expcat_company_name (company_id, name),
  UNIQUE KEY uq_expcat_company_id (company_id, id),
  CONSTRAINT fk_expcat_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE expenses (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(300) NOT NULL,
  vendor      VARCHAR(200) NULL,
  amount      DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  status      ENUM('draft','approved','paid','void') NOT NULL DEFAULT 'draft',
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_expenses_company_id (company_id, id),
  KEY idx_expenses_company_date (company_id, expense_date),
  CONSTRAINT chk_expenses_amount CHECK (amount > 0),
  CONSTRAINT fk_expenses_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_expenses_category FOREIGN KEY (company_id, category_id) REFERENCES expense_categories (company_id, id),
  CONSTRAINT fk_expenses_user FOREIGN KEY (company_id, created_by) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- direction: incoming = cash received, outgoing = cash paid (expense payment or customer refund).
CREATE TABLE payments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  direction   ENUM('incoming','outgoing') NOT NULL,
  kind        ENUM('payment','refund') NOT NULL DEFAULT 'payment',
  invoice_id  BIGINT UNSIGNED NULL,
  expense_id  BIGINT UNSIGNED NULL,
  refund_of_payment_id BIGINT UNSIGNED NULL,
  amount      DECIMAL(15,2) NOT NULL,
  method      VARCHAR(40) NOT NULL DEFAULT 'bank_transfer',
  reference   VARCHAR(100) NULL,
  paid_at     DATE NOT NULL,
  status      ENUM('pending','completed','failed','void') NOT NULL DEFAULT 'completed',
  idempotency_key VARCHAR(100) NOT NULL,
  recorded_by BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_company_idem (company_id, idempotency_key),
  UNIQUE KEY uq_payments_company_id (company_id, id),
  KEY idx_payments_company_paid (company_id, paid_at),
  KEY idx_payments_invoice (company_id, invoice_id),
  CONSTRAINT chk_payments_amount CHECK (amount > 0),
  CONSTRAINT chk_payments_target CHECK (
    (direction = 'incoming' AND kind = 'payment' AND invoice_id IS NOT NULL AND expense_id IS NULL)
    OR (direction = 'outgoing' AND kind = 'refund' AND invoice_id IS NOT NULL AND refund_of_payment_id IS NOT NULL)
    OR (direction = 'outgoing' AND kind = 'payment' AND expense_id IS NOT NULL AND invoice_id IS NULL)
  ),
  CONSTRAINT fk_payments_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_payments_invoice FOREIGN KEY (company_id, invoice_id) REFERENCES invoices (company_id, id),
  CONSTRAINT fk_payments_expense FOREIGN KEY (company_id, expense_id) REFERENCES expenses (company_id, id),
  CONSTRAINT fk_payments_refund_of FOREIGN KEY (company_id, refund_of_payment_id) REFERENCES payments (company_id, id),
  CONSTRAINT fk_payments_user FOREIGN KEY (company_id, recorded_by) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE investments (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  category    VARCHAR(100) NOT NULL,
  purpose     VARCHAR(500) NULL,
  amount      DECIMAL(15,2) NOT NULL,
  invested_at DATE NOT NULL,
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_investments_company_id (company_id, id),
  KEY idx_investments_company_date (company_id, invested_at),
  CONSTRAINT chk_investments_amount CHECK (amount > 0),
  CONSTRAINT fk_investments_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_investments_user FOREIGN KEY (company_id, created_by) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE investment_returns (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id    BIGINT UNSIGNED NOT NULL,
  investment_id BIGINT UNSIGNED NOT NULL,
  amount        DECIMAL(15,2) NOT NULL,
  returned_at   DATE NOT NULL,
  note          VARCHAR(300) NULL,
  created_by    BIGINT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_invret_company_inv (company_id, investment_id),
  CONSTRAINT chk_invret_amount CHECK (amount > 0),
  CONSTRAINT fk_invret_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_invret_investment FOREIGN KEY (company_id, investment_id) REFERENCES investments (company_id, id),
  CONSTRAINT fk_invret_user FOREIGN KEY (company_id, created_by) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sales_targets (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NULL,           -- NULL = company-wide target
  period_start DATE NOT NULL,
  period_end  DATE NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_targets_company_period (company_id, period_start, period_end),
  CONSTRAINT chk_targets_amount CHECK (amount > 0),
  CONSTRAINT chk_targets_period CHECK (period_end >= period_start),
  CONSTRAINT fk_targets_company FOREIGN KEY (company_id) REFERENCES companies (id),
  CONSTRAINT fk_targets_user FOREIGN KEY (company_id, user_id) REFERENCES users (company_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id  BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id   BIGINT UNSIGNED NULL,
  details     JSON NULL,                       -- never store passwords, tokens or secrets
  ip_address  VARCHAR(64) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_company_created (company_id, created_at),
  KEY idx_audit_company_entity (company_id, entity_type, entity_id),
  CONSTRAINT fk_audit_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-company sequential document numbers (INV-000001, QUO-000001).
CREATE TABLE document_counters (
  company_id BIGINT UNSIGNED NOT NULL,
  kind       VARCHAR(20) NOT NULL,
  last_number BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, kind),
  CONSTRAINT fk_counters_company FOREIGN KEY (company_id) REFERENCES companies (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
