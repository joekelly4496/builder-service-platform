# Homefront — Claude Code Context

## Project Overview

Homefront is a post-closing SaaS platform for residential home builders. It manages warranty requests, subcontractor coordination, and homeowner communication. The long-term goal is a scalable multi-tenant SaaS business.

## Repository & Deployment

- GitHub: joekelly4496/builder-service-platform
- Live URL: builder-service-platform-gm84uvd3e.vercel.app
- Hosting: Vercel
- Database: Supabase (PostgreSQL + Auth)

## Tech Stack

- Framework: Next.js 16 (App Router)
- Database ORM: Drizzle ORM
- Auth: Supabase Auth + @supabase/ssr
- Storage: Vercel Blob (photos/files)
- Email: Resend
- Cron jobs: Vercel Cron
- Language: TypeScript throughout

## Three Portals

1. **Builder portal** — staff dashboard, homes, requests, subcontractor management
2. **Homeowner portal** — self-service request submission, status tracking, messaging
3. **Subcontractor portal** — assigned job dashboard, status updates, photo uploads

## Database — Drizzle ORM Rules

- Schema uses camelCase (e.g. `photoUrls`) but maps to snake_case in the DB (e.g. `photo_urls`)
- Mismatches between camelCase and snake_case cause silent failures — always check both
- Two maintenance tables exist: `maintenanceItems` (physical items) and `maintenanceReminders` (recurring schedules)
- Homeowner email is stored on the `homes` table
- Auth uses `homeownerAccounts` table linking `supabaseUserId` to `homeId`
- TEST_BUILDER_ID: `75c73c79-029b-44a0-a9e3-4d6366ac141d`

## Known Issues (Pre-Existing — Do Not Fix Unless Asked)

- Pre-existing TypeScript errors for `@/lib/supabase/server` — ignore
- Pre-existing errors for `LinkSubcontractorButton` — ignore
- These do not block Vercel builds

## Critical Coding Rules

### Next.js 16 Dynamic Routes

Dynamic route params MUST be awaited:

```ts
const { id } = await params
```

Type must be: `Promise<{ id: string }>`

Forgetting this causes Vercel deployment failures — check every dynamic route.

### Vercel Edge Caching

If a page shows stale data, add at the top of the file:

```ts
export const dynamic = "force-dynamic"
```

### TypeScript Errors

- VS Code TypeScript errors are sometimes false positives
- Before attempting fixes, run: `npx tsc --noEmit`
- Only fix errors that appear in that command — not VS Code squiggles

### Supabase Service Role Key

- Uses newer `sb_secret_` format
- Using the wrong key format causes "Invalid API key" errors

### Sub Portal Route Conflict

- The `/sub/[token]` dynamic route can intercept other portal routes
- Fixed by checking `reservedRoutes` — do not remove this check

## Environment Variables (Do Not Hardcode These)

All secrets live in `.env.local` and Vercel environment settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `BLOB_READ_WRITE_TOKEN`

## PRIORITY ZERO — Multi-Tenancy Architecture

This must be built before any new builder accounts are created. Nothing else takes priority over this.

### What needs to happen

1. **Create a tenants table** in Supabase via Drizzle schema:

```
id              UUID (PK, default gen_random_uuid())
companyName     VARCHAR NOT NULL
slug            VARCHAR UNIQUE NOT NULL
planTier        ENUM ('intro', 'starter', 'growth', 'pro') DEFAULT 'intro'
stripeCustomerId VARCHAR
brandingConfig  JSONB (logo, primaryColor, companyName for white label)
createdAt       TIMESTAMP DEFAULT now()
isActive        BOOLEAN DEFAULT true
```

2. **Add tenantId foreign key** to every tenant-scoped table:
   - homes
   - serviceRequests
   - homeownerAccounts
   - maintenanceItems
   - maintenanceReminders
   - staffUsers (new table needed)
   - billingRecords (new table needed)

3. **Enable Row Level Security (RLS)** in Supabase on every tenant-scoped table:
   - Policy: user's tenantId JWT claim must match the row's tenantId
   - This is the safety net — even if app code has a bug, the DB refuses cross-tenant access

4. **Update authentication** to attach tenantId to session:
   - On login, look up the user's tenantId from the accounts table
   - Store in Supabase JWT custom claims or secure session cookie
   - Never trust tenantId from the client — always derive server-side

5. **Create Next.js middleware** for tenant scoping:
   - Every authenticated API route must extract tenantId from the session
   - Every DB query must filter by tenantId
   - No exceptions

6. **Subcontractor cross-tenant logic:**
   - Subs can work for multiple builders
   - Sub profile is global (marketplace-visible to all)
   - Each builder-sub relationship is a separate `builderSubcontractorRelationships` table record
   - A sub only sees jobs from builders they have an active relationship with

7. **Test with two fully isolated builder accounts** before declaring done:
   - Create two test builder accounts
   - Verify Builder A cannot see Builder B's data under any circumstances
   - Test homeowner and sub portals for both builders

## Features Currently Built

- Builder dashboard (homes, requests, staff management)
- Homeowner portal (login, dashboard, request detail, photos, messaging, calendar, ratings)
- Subcontractor portal (login, signup, forgot/reset password, dashboard, request detail)
- Photo upload — submitted + completion photos via Vercel Blob
- SLA tracking and cron-based reminder emails
- Maintenance reminders system (builder UI + homeowner read-only, cron job)
- Email notifications via Resend

## Features on the Roadmap (Build After Multi-Tenancy)

### Phase 1 — Subcontractor Public Profiles

- Global public profile page per sub (`/subcontractors/[slug]`)
- Trade type, service area, bio, license/insurance upload
- Insurance expiration date field + expiration tracking alerts
- Pricing ranges by job type (optional, badged)
- Verified badge when license + insurance confirmed
- Builder search and filter UI for discovering subs

### Phase 2 — Reviews + Job Cost Tracking

- Review system (builder + homeowner reviews on completed jobs)
- Manual reviews free for all subs
- Automated review collection (Sub Pro only — triggered on job completion via Resend)
- Review showcase widget (free for all subs)
- Job cost field on service request completion (builder-only input)
- Cost intelligence dashboard for builders (avg cost per sub per job type)
- Homeowner service history view (clean read-only, shows cost + photos)

### Phase 3 — SMS Business Numbers

- Twilio integration for provisioning local phone numbers
- Number provisioned automatically on Sub Pro subscription activation
- SMS send/receive UI in sub dashboard, linked to job records
- Per-message billing via Stripe metered billing ($0.03/outbound SMS)
- TCPA opt-out handling (STOP replies)

### Phase 4 — CPC Sponsored Placement

- Sub ad campaign creation (max CPC bid + monthly budget cap)
- Auction logic — highest bidder for trade + zip gets top placement in builder search
- Click tracking and deduplication
- Budget cap enforcement with auto-pause
- CPC billing via Stripe at end of billing cycle

### Phase 5 — Stripe Billing

- Builder subscription billing (Intro $49, Starter $199, Growth $449, Pro $899/month)
- Sub Pro subscription billing ($29/month)
- Payment processing for homeowner subscriptions (Stripe Connect — builder keeps spread)
- Transaction fee on homeowner payments (Homefront takes 1% spread)
- Metered billing for SMS per-message charges

## Coding Standards

- Always provide complete file contents — no partial snippets
- TypeScript strict mode — no `any` types without justification
- All API routes must validate authentication before doing anything else
- All API routes must validate tenantId scoping after multi-tenancy is built
- Drizzle migrations for all schema changes — never modify the DB directly
- Environment variables for all secrets — never hardcode

## How to Work in This Repo

- One feature or task at a time
- Always run `npx tsc --noEmit` after changes to check for real errors
- Test locally with `npm run dev` before pushing to Vercel
- Do not push to GitHub until the feature works locally
