# ProTracer Package Builder

A public, customer-first configuration and comparison experience for ProTracer. Customers (or a sales representative sitting with a customer) can build a video setup, choose exact hardware quantities, add extras, estimate **state-level tax on equipment**, and compare individual catalog-item pricing with a fitted ProTracer package. There is **no sign-in, customer account, invoice, database, API key, payment, or backend**.

![ProTracer](public/protracer-logo.png)

## How to use

1. Choose the type of organization and number of named teams.
2. Enter **the total quantities needed** for cameras, sport-specific mounts, recording cards, processing laptops, tripods, protective cases, iPads and local backup drives. One package camera includes one mount and one recording card. Camera changes automatically adjust requested mounts/cards, but users can edit them separately. Use the `1 camera / team` or `2 cameras / team` shortcuts to start faster.
3. Set storage, video-delivery allowance, retention, support/protection, remote training, annual-prepay or monthly-service billing, and a one- or two-year service commitment.
4. Click **Add optional extras** for truly *additional* items beyond the quantities entered above. The catalog includes equipment, installation and annual options. An extra camera and a mount can automatically receive the published camera/mount bundle price.
5. Enter a **five-digit ZIP** to auto-identify city/state, or choose a **state** directly. State tax is calculated automatically against the hardware taxable-base estimate. See the limitation below.
6. Compare the **individually listed equipment + Basic software benchmark** (NOT a standalone approved offer), the **recommended base package**, and the **configured package with requested upgrades and extras**. Choose **at most one** package-eligible promotional benefit. Grayed-out promotions are unavailable under the selected tier, payment cadence, or service term. Customer-supplied equipment does **not** consume a promotion slot. Review bonus value not originally requested. Print or copy a summary. No data is submitted or saved.

## Updated FY2027 customer package catalog (November 17, 2026)

| Package | One-time equipment + setup | Annual service prepaid | Monthly service | Year 1 (annual plan) | Included cameras / mounts / cards |
| --- | ---: | ---: | ---: | ---: | --- |
| Basic Team | $4,292.80 | $2,102.20 | $207.60 | **$6,395** | 1 / 1 / 1 |
| Basic Team — Use Your Computer (conditional) | $2,892.80 | $2,102.20 | $207.60 | **$4,995** | 1 / 1 / 1 |
| Team Plus | $6,392.80 | $2,102.20 | $207.60 | **$8,495** | 2 / 2 / 2 |
| Premium Team | $6,751.60 | $3,743.40 | $366.20 | **$10,495** | 2 / 2 / 2 |
| Athletic Department (5 named teams) | $22,300 | $22,995 | $2,299.50 | **$45,295** | 5 / 5 / 5 |

The department plan includes five full Basic kits. Each additional sixth-through-tenth named team adds **$4,495 one-time** and **$4,495 annual service** (or $449.50 monthly), plus one camera, mount, card, processing laptop and configured iPad. More than ten named teams is a custom quote. All hardware is paid upfront; monthly installments apply only to software/service. Additional equipment does not grant an additional named team license.

The catalog is derived from [ProTracer financial model FY2027–FY2031, November 17, 2026](https://docs.google.com/spreadsheets/d/1uZ5NzyRCeiEFvYMgHyHUoPUxyccnkAPo34DlKnGdXBU/edit). These prices incorporate mandatory iPads, the one-mount-per-camera policy, and the revised Basic and Athletic Department pricing.

## Device BYOD discounts and promotional offers

All standard complete kits include **one processing laptop and one configured refurbished iPad per licensed team**; the five-team Department package includes five of each. Schools may choose Basic Team with a compatible customer-supplied processing computer, reducing the first-year price from $6,395 to **$4,995**. This Basic computer BYOD requires ProTracer engineering certification.

Any package can alternatively use customer-provided compatible iPads instead of ProTracer-provided devices. The equipment credit is **$500 per named team**. Basic becomes **$5,895** with an own iPad but supplied laptop; combining the Basic school-owned computer and iPad options produces **$4,495** for the first service year before tax. Department customers supplying all five iPads receive a $2,500 credit. The customer must still furnish compatible devices. The iPad cannot substitute for the processing computer.

Device BYOD choices are **not promotional giveaways**, so both device BYOD choices may be combined with **one** eligible promotional benefit. The available promotions are one of: 250 GB additional first-year retained storage; 50 GB/month additional video delivery for 12 months; one extra remote training hour; one extra sport mount; one 6 TB backup drive; or a *request* for a 24-month subscription rate lock. The rate lock requires separate team approval and is never guaranteed by the estimator.

Promotion options are constrained by the actual package, billing frequency and one- or two-year commitment. Noneligible offers remain visible but grayed out with a reason. The permitted term and prepaid requirements come from Jeff's November 17 sales offer card. Cloud promotions do not extend 12- or 24-month retention rights. Year two of a two-year commitment is billed separately unless the written agreement specifies otherwise.

## Automatic destination state tax estimation

- The state dropdown immediately applies the **state-level 2026 sales tax** to the sum of bundled equipment/setup plus tangible additional equipment. It does **not** tax separately listed subscriptions, training, installation, or other services for this *planning* estimate.
- Entering a five-digit US ZIP automatically looks up city/state using the free [Zippopotam.us postal-code API](https://docs.zippopotam.us/docs/getting-started/) and applies that state's rate. If ZIP lookup is unavailable, customers can choose their state manually. ZIP is only used to identify state, **not** an exact sales-tax jurisdiction.
- Rates originate in the [Tax Foundation State and Local Sales Tax Rates, Midyear 2026](https://taxfoundation.org/data/all/state/2026-sales-tax-rates-midyear/), state-level column as of July 1, 2026 (`lib/tax.ts`). 50 states and DC are covered; rates include fractional percentages where applicable.
- **Important limitation:** Local, city, county, district, destination-based special taxes, tax exemptions, seller nexus, special taxability rules, and freight taxability are NOT in this estimate. Zero state tax in Alaska does **not** imply zero local tax. The source has periodic changes, so rates must be refreshed regularly.
- The financial model does not state a separate taxable-hardware versus non-taxable-setup allocation for each equipment/setup bundle. Therefore, the full combined equipment/setup line is provisionally treated as taxable tangible equipment. ProTracer's CPA/tax service should verify or break out separately stated labor before a real binding invoice.
- This app is **not** a tax compliance engine, order, payment link, or invoicing system. The actual full combined tax must be determined at checkout or a formal quote. Do not use state-only estimates as final collected taxes.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. There are no environment variables or database migrations.

## Static build (no Vercel required)

```bash
npm test
npm run typecheck
npm run build
```

The app produces static files in `out/`, deployable to GitHub Pages, S3/CloudFront, or any static host. No Next.js server is needed. For GitHub Pages *project* paths, set `NEXT_PUBLIC_BASE_PATH=/ProTracer-sales-dashboard` during build, e.g. `NEXT_PUBLIC_BASE_PATH=/ProTracer-sales-dashboard npm run build`. For a domain served at `/`, leave the variable unset. GitHub Pages publishing must be enabled separately in repository settings if desired; this commit does **not** deploy a site or alter a live domain.

`npm start` serves the generated `out/` files using a local static-server command.

## Important product behavior

- **Individual benchmark:** Hardware at published add-on list prices plus the Basic Team service as a reference. This is **not** a separately approved unbundled product offering and does not match the higher service, retention or department scope of every package.
- **Recommended package:** An eligible package selected for its combination of total first-year cost and bundled benefits. For two-camera single-team requirements, Team Plus may be a better overall value than a slightly less expensive Basic package plus camera bundle because Team Plus also includes a Pelican case. Actual prices are never discounted by the recommendation heuristic.
- **Configured package:** The chosen package plus just the quantities missing from its included equipment, plus customer-selected extras and service selections. Every package already includes **one mount and one recording card per included camera**. No automatic double-charge for included hardware or support/protection.
- **Usage:** Storage and streaming/download allowance are separate meters. Projected overages at $0.25 per excess GB-month or delivered GB are *illustrative* and not due at signing.
- **Tax totals:** Shown as **state-only estimates** when a state is selected; before-tax totals otherwise. State/local/district taxes, freight, exemptions and special quoting are not included.

## Files

- `components/SalesApp.tsx`: customer UX, ZIP lookup, print and copy summary
- `lib/catalog.ts`: packages and optional extras
- `lib/promotions.ts`: package- and term-specific promotion eligibility
- `lib/quote.ts`: pricing, recommendation and quantity-credit logic
- `lib/tax.ts`: state rates and hardware-only tax calculation
- `lib/states.ts`: state names and codes
- `tests/quote.test.ts`: contract-style price, BYOD, promotion, equipment, tax and quote regression tests
- `app/globals.css`: responsive ProTracer-branded design
- `public/protracer-logo.png`: ProTracer transparent wordmark

No customer personally identifying information is collected. ZIP lookup goes to Zippopotam.us only when a customer enters a five-digit ZIP. Print and clipboard operations run in the customer's browser.
