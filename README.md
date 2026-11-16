# ProTracer Sales Studio

A responsive, guided sports-technology package finder and draft-invoice application for ProTracer. Built with **Next.js, TypeScript, React, PostgreSQL**, and a transparent quote engine. Designed for customers **and** sales representatives.

## What the app does

- Friendly four-step questionnaire using actual radio buttons, dropdowns, stepper quantities and conditional inputs.
- Recommends the lowest **eligible** estimated 12-month package, rather than the lowest sticker price.
- Compares Basic Team, Team Plus, Premium Team and Athletic Department on cost, included cameras, retained storage, monthly delivery, retention, support and added equipment.
- Handles up to 10 named teams under published Athletic Department rules, including sixth-through-tenth complete kit + annual license charges. Eleven or more teams / 36-month retention trigger custom review.
- Automatically prices **required cameras, mounts, cases, priority support, protection and training**; uses the less expensive camera-plus-mount bundle where appropriate.
- Supports optional add-ons and monthly vs annual service plans.
- Separates **taxable physical hardware** from subscriptions, support, training, installation, technician days and travel services.
- Shows **PENDING** sales tax until shipping state/ZIP and a verified combined state/local rate are supplied. The rep must attest to verification and record a rate source. Never silently assumes 0%.
- Prints a clear quote as PDF through the browser's native Print > Save as PDF flow.
- After the optional server configuration, sales reps can save secure draft invoices. The server allocates **unique 10-digit customer numbers** and unique invoice numbers in PostgreSQL, with transactional locks and unique constraints. Repeat quotes to the same normalized billing name+organization reuse the customer number.

## Price source and date

**November 16, 2026**: [ProTracer FY2027-FY2031 Financial Model](https://docs.google.com/spreadsheets/d/1uZ5NzyRCeiEFvYMgHyHUoPUxyccnkAPo34DlKnGdXBU/edit) and the [approved Sales Catalog](https://docs.google.com/spreadsheets/d/1T_Nji-h7TxxG-Z2I2qegqSw2jTnfdaGo9QRLgzUyExQ/edit).

| Package | One-time equipment/setup* | Annual service | Annual-prepay first year | Monthly base service |
| --- | ---: | ---: | ---: | ---: |
| Basic Team | $4,592.80 | $2,102.20 | $6,695 | $207.60 |
| Team Plus | $6,392.80 | $2,102.20 | $8,495 | $207.60 |
| Premium Team | $6,751.60 | $3,743.40 | $10,495 | $366.20 |
| Athletic Department | $19,995 | $22,995 | $42,990 | $2,299.50 |

An Athletic Department includes **five complete team kits** and licenses; the sixth through tenth team adds $4,495 of one-time equipment + $4,495/year in service ($449.50/month). Consumption is pooled for Department; single-team packages are independent. For teams above ten, quote manually.

\* **Tax allocation review**: The financial model presents a single one-time **equipment/setup** price, not a separate hardware-versus-setup sales price. The prototype classifies that full **bundled** one-time amount as hardware for an *estimate*, pending finance confirmation. If you separately state non-taxable installation or setup services, split out that amount in `lib/catalog.ts`/`lib/quote.ts` before quoting final tax. Do not treat this as a tax-law determination.

## Get it running locally

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Visit http://localhost:3000. Without environment variables, **all package matching and print/PDF quote previews work**. Saving a permanent draft invoice will correctly return a configuration error instead of pretending a save succeeded.

To run quote tests:

```bash
npm test
npm run typecheck
npm run build
```

## Activate shared draft invoices

1. Create a managed PostgreSQL database (for example, Neon, Supabase, or another Vercel-compatible provider). Use a TLS-encrypted connection string.
2. Execute `db/schema.sql` **once** in that database (your provider's SQL editor works).
3. Generate a random **32+ character** staff key; do not reuse passwords.
4. Copy `.env.example` to `.env.local` and set `DATABASE_URL` and `SALES_REP_SECRET`. On Vercel, add both as **server-only environment variables** (never `NEXT_PUBLIC_`).
5. Restart the local app or redeploy. Visit `/api/health` to confirm `invoiceSavingConfigured: true`.
6. In the app, select **Sales team**. Complete customer details and shipping location, verify an actual combined state/local sales tax rate, record the source, and confirm the review box. Select **Save draft invoice** and enter the staff key.
7. A saved draft receives `PT-INV-YYYY-XXXXXX` and a unique 10-digit customer number. The backend writes an immutable quote snapshot into `draft_invoices` with `DRAFT` status. No email, payment or tax remittance occurs.

**Database uniqueness**: `customers.customer_number` is a primary key, `customers.identity_key` is unique, and the customer number is backed by a database sequence starting at `1000000001`. The service wraps customer lookup/upsert plus invoice insert in a single PostgreSQL transaction. Simultaneous users cannot cause duplicate numbers. A customer can have many invoices.

**Authorization note**: This starter uses a **single shared representative key** for staff draft saving. For a production multi-rep rollout, replace that mechanism with individual organization SSO, role-based permissions, audit logs and per-representative access control. Do **not** enable broad public create/update access to the database.

## State-by-state sales tax: important operational policy

The default customer-facing experience collects **shipping state and ZIP** and labels tax **Pending**. Staff can enter a **verified combined state + local jurisdiction rate** (including local districts) and a reference/source. Tax applies ONLY to lines tagged physical hardware; annual subscriptions, training, installation and other service lines are excluded under ProTracer's requested pricing policy. It does **not** guess a statewide rate, and it does not interpret an unknown rate as zero. **Actual state taxability can differ**: delivery charges, service bundles and software can be taxable in some states; nexus, registration, sourcing, shipping addresses and exemption certificates must be reviewed with your tax advisor. A 0% quote needs documented verification as well. Before nationwide commercial release, connect a maintained jurisdiction tax service (Stripe Tax, Avalara or TaxJar) and use correctly assigned product tax codes with an approved nexus/registration matrix.

This application is a **quote preparation / draft invoice** tool, not a tax filing service or accounting ledger. Drafts are not tax invoices.

## Deploy to Vercel (after publishing GitHub repository)

1. Import the `protracer-sales` GitHub repository in Vercel.
2. Vercel detects Next.js. Framework preset: **Next.js**. Project root: `/`.
3. The public package finder can deploy without database credentials; do not suggest invoice saving is live until configured.
4. For real rep saving, configure both `DATABASE_URL` and `SALES_REP_SECRET` for the intended environment, run `db/schema.sql`, then deploy.
5. Protect sensitive routes using individual SSO before scaling rep access. Test calculations, staff authorization, and jurisdiction tax rules before accepting actual commercial orders.

This application is standalone and does **not** modify the existing ProTracer CloudFront portal, the legacy Apps Script, the original financial model or the coaching repository.

## Project structure

```
app/page.tsx             Customer/rep app entry point
app/globals.css          Responsive visual design and print styles
components/SalesApp.tsx  Four-step UI, package cards, itemized breakdown
lib/catalog.ts           Approved package & add-on prices
lib/quote.ts             Eligibility, bundle logic, subscriptions and hardware-only tax
lib/states.ts            Destination state choices
app/api/drafts/route.ts  Authenticated transactional draft save
app/api/drafts/[id]/route.ts  Private draft record retrieval
lib/db.ts                PostgreSQL connection
lib/auth.ts              Staff access-key verification
lib/api-schema.ts        Strict server validation
 db/schema.sql           Transactional DB schema / unique ID sequences
 tests/quote.test.ts     Key pricing, eligibility, bundle and tax tests
```

### Verification status

The quoted package logic was tested in this authoring environment using the included tests. Build and browser verification additionally require npm dependencies to install successfully. This authoring environment could not reach the npm registry, so no successful `next build` or live deployment is claimed here.
