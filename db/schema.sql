-- ProTracer Sales - run ONCE in your hosted PostgreSQL database.
-- The database, not the browser, allocates IDs. UNIQUE constraints prevent
-- concurrent representatives assigning the same customer or invoice number.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS customer_number_seq
  AS BIGINT START WITH 1000000001 INCREMENT BY 1 MINVALUE 1000000001 MAXVALUE 9999999999 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq
  AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE TABLE IF NOT EXISTS customers (
  customer_number BIGINT PRIMARY KEY DEFAULT nextval('customer_number_seq'),
  identity_key TEXT NOT NULL UNIQUE,
  billing_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_id_10_digits CHECK (customer_number BETWEEN 1000000000 AND 9999999999)
);
CREATE TABLE IF NOT EXISTS draft_invoices (
  id UUID PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_number BIGINT NOT NULL REFERENCES customers(customer_number),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','VOID')),
  billing_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  team_names TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  rep_name TEXT NOT NULL,
  package_id TEXT NOT NULL,
  billing_cadence TEXT NOT NULL,
  hardware_cents BIGINT NOT NULL,
  nonhardware_cents BIGINT NOT NULL,
  tax_cents BIGINT NOT NULL,
  due_now_cents BIGINT NOT NULL,
  twelve_month_cents BIGINT NOT NULL,
  tax_state TEXT NOT NULL,
  tax_zip TEXT NOT NULL,
  tax_rate_percent NUMERIC(6,3) NOT NULL,
  tax_source TEXT NOT NULL,
  tax_verified_by TEXT NOT NULL,
  answers_snapshot JSONB NOT NULL,
  quote_snapshot JSONB NOT NULL,
  catalog_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS draft_invoices_customer_idx ON draft_invoices(customer_number,created_at DESC);
COMMIT;
