# BuildMate V.2 — Codebase Audit & Root Cause Analysis

**Date:** 2026-10-17 · **Commit audited:** `8694cd8` (branch `main`, clean tree) · **Mode:** read-only (no code, schema or data was modified; no live service contacted)

---

## Scope of inspection

| Area | Inspected | Method |
|---|---|---|
| All 207 tracked files: `app/**` (pages + 37 API routes), `lib/**`, `components/**`, `middleware.ts`, `scripts/*`, `supabase/**` (4 migrations, `SETUP_FULL_DATABASE.sql`, `seed.sql`), config, `docs/spec/*`, `docs/BUILD_STATUS.md` | Yes | Static reading, call-site tracing (`.from(`, `storage.from`, `.rpc(`), cross-referencing schema vs queries |
| `npx tsc --noEmit` | Executed | **0 errors** |
| `npx eslint .` | Executed | **421 problems (238 errors, 183 warnings)**, exit 1 |
| Automated tests | None exist | — |
| `next build`, `next dev`, live Supabase, Midtrans | **Not executed** | Out of scope for read-only audit; see Section 11 |

Every P0/P1 finding below was **spot-verified against the source** (file and line re-read) in addition to the subsystem passes. Line numbers refer to commit `8694cd8`.

Confidence labels: **CONFIRMED** = provable from source alone. **PROBABLE** = depends on which SQL is deployed or on runtime conditions that could not be observed.

---

## Section 1 — Executive Summary

BuildMate compiles cleanly, but it **is not production-safe**. Three systemic root causes produce most of the defects:

1. **Money paths trust the caller.** There are three independent ways to obtain a paid order or a Plus membership without paying:
   - an unauthenticated `POST /api/orders/[id]/pay` endpoint (a leftover sandbox simulator);
   - a Midtrans webhook whose signature check is skipped when `signature_key` is omitted;
   - a `POST /api/subscriptions/status` endpoint that grants Plus to any logged-in user.
2. **There is no single trusted source for identity and role.** Authorization is assembled from:
   - `profiles.role`;
   - **user-editable `user_metadata`**;
   - hard-coded email addresses;
   - a DB trigger that copies `signup_as`/`staff_role_id` from client-supplied signup metadata.

   `SETUP_FULL_DATABASE.sql` also grants users an unrestricted `UPDATE` on their own `profiles` row, which would let any customer set `role='admin'`. Several API routes (order detail, all `/api/mitra/**`, `verify-email`) have no authentication or ownership check at all.
3. **The database is not the source of truth.** Order transitions, dispatch, every mitra action, admin order actions, complaints, payouts, the dashboard and parts of the catalog run on per-process in-memory arrays seeded from `lib/mock/data.ts`.
   - Admin order actions execute **in the browser** and never reach the DB.
   - On Vercel (many instances, cold starts) a paid order can never be fulfilled end-to-end, and state differs per instance.
   - Supabase `{ error }` results are routinely ignored, so failures report success.

**Recommended next steps (in order):**
1. Close the payment holes (FP-01, FP-02).
2. Fix order IDOR (FP-03).
3. Establish one trusted role source and lock the `profiles` policy (FP-04), after confirming which SQL is live.
4. Fix email-verify takeover (FP-05) and mitra API auth (FP-06).
5. Then declare one schema source of truth (FP-07) and move the order lifecycle into transactional DB functions (FP-08, FP-09, FP-10).

---

## Section 2 — Architecture Overview

| Aspect | Finding |
|---|---|
| Framework | Next.js **16.4.0** App Router, React 19.3, TypeScript strict, Tailwind 4, `cacheComponents: true` |
| Request gate | `middleware.ts`: deprecated name in Next 16 (now "proxy") but still executed. The matcher (`middleware.ts:418-432`) covers pages only, **not `/api/**`**, so every API route must guard itself. |
| Data | Supabase Postgres + Auth + Storage. No ORM. Uses `@supabase/supabase-js` and `@supabase/ssr`. **No RPCs** (`.rpc(` appears nowhere). |
| Clients | `lib/supabase/admin.ts` (service role, bypasses RLS) is used by nearly every API route and `lib/data/*`. `lib/supabase/client.ts` (anon, browser) is used by `lib/data/workers.ts` and several pages. `lib/supabase/server.ts` handles the cookie session. |
| Payments | Midtrans Snap (`lib/midtrans.ts`) with webhook `app/api/webhooks/midtrans/route.ts`. Order IDs are `ORD-<order_code>` and subscriptions `SUB-…`. |
| Areas | Customer (`/`, `/search`, `/services/[id]`, `/order/[packageId]`, `/payment/[orderId]`, `/orders`, `/plus`, `/account`). Mitra (`/mitra/**`). Admin (`/admin/**`, almost all `"use client"`). |
| Authorization model (intended) | `profiles.role ∈ {customer, worker, admin, staff}`. Staff have `profiles.staff_role_id → roles.permissions[]` and `profiles.staff_status`. Checks: `lib/supabase/auth.ts` `getUserPermissions` / `requireApiPermission` / `requireApiSuperAdmin`. RLS helper `my_role()` and `has_permission()`. |
| Authorization model (actual) | `profiles.role` **OR** `user_metadata.role/signup_as/staff_status/staff_role_id` (`lib/supabase/auth.ts:60-63`, `middleware.ts:118-136, 202-215`, `app/auth/callback/route.ts:80`). Also **OR** hard-coded emails (`middleware.ts:105,197`, `lib/supabase/auth.ts:44`, `app/auth/callback/route.ts:102`, `app/api/orders/route.ts:31`, `lib/auth/email-check.ts:18-20`, `lib/data/team.ts:28-30`). Special case: one email forced to customer. |
| State | Module-level mutable arrays act as a database: `inMemoryOrders` (`lib/data/orders.ts:5`), `MOCK_ORDERS` (`lib/data/mitra.ts`), `inMemoryContent`, `inMemoryFaq`, `inMemoryPackages`, `inMemoryCategories`, `inMemoryStaff`, `inMemoryRoles`, `inMemoryAuditLogs`, and the payouts/transactions mocks. |
| Tests / CI | None. `scripts/test-*.ts` run against the real DB using the service-role key. |

**Order lifecycle as implemented:**

| Transition | Actor / route | Persisted to DB? |
|---|---|---|
| ∅ → `pending_payment` | `POST /api/orders` → `createCustomerOrder` (Snap is created *before* the DB insert) | Partially: orders, photos, events, payments; errors swallowed |
| → `paid` | Webhook, `GET /api/orders/[id]` status sync, **unauthenticated `POST /api/orders/[id]/pay`** | Yes |
| → `cancelled` | Webhook; customer cancel | Yes (no ownership check) |
| `paid → worker_confirmed` | Mitra accept (`lib/data/mitra.ts`), admin manual assign (browser) | **No**: `MOCK_ORDERS` / browser memory only |
| `worker_confirmed → on_the_way → in_progress → awaiting_confirmation` | Mitra status, photos | **No** (photos go to a public bucket, no `order_photos` row) |
| `→ completed` | Customer confirm (DB); admin (browser only) | Partially |
| Complaint filed | Customer | **No** (memory only; `complaints` table never written) |
| `completed → payout` | — | **Never** (`payouts`, `job_offers` and `app_settings` have zero writes) |

---

## Section 3 — Database & Relationship Audit

### Table inventory

| Table | Key columns / FKs | RLS (migrations) | Used by |
|---|---|---|---|
| profiles | id→auth.users CASCADE; staff_role_id→roles SET NULL | admin only. Self-policies exist **only in SETUP_FULL** (unrestricted UPDATE) | auth, middleware, callback, team, orders |
| categories / service_packages | slug unique; package→category CASCADE | admin + public active | services.ts, orders.ts |
| workers | user_id unique; reviewed_by (no ON DELETE) | admin; public approved (**all columns**); owner `FOR ALL` | workers.ts (anon), mitra.ts, middleware |
| worker_packages | PK(worker, package) | RLS on, **no policies** | workers.ts (anon writes silently fail) |
| orders | customer/worker/package FK (no ON DELETE); dispatch cols (migration only) | admin, staff, worker. **No customer policy** | orders.ts, webhook |
| order_photos / order_events / complaints / subscriptions | order_id CASCADE | RLS on, **no policies** | various |
| payments | provider_order_id unique; `ref_id` **no FK** | admin only | orders, webhook, subscriptions |
| payouts | order_id unique CASCADE | admin/staff/worker | **unused** (in-memory) |
| roles, site_content, faq_items, admin_audit, job_offers, app_settings | — | yes | job_offers and app_settings **unused** |

### Findings

- **DB-001 (P1, CONFIRMED) — Two divergent schema sources.**
  - `supabase/SETUP_FULL_DATABASE.sql` predates the staff and mitra migrations. It lacks `roles`, `site_content`, `faq_items`, `admin_audit`, `job_offers`, `app_settings`, the `staff_*` columns, the dispatch columns and the `'staff'` role.
  - It also contains things the migrations lack: an unrestricted self-update policy (`:278`) and a seed that grants `role='admin'` to a hard-coded email (`:384-389`).
  - Its seed reuses id `b0000000-…-0002`, so one package is silently dropped.
  - Running SETUP_FULL and then the migrations fails, because bare `create policy` statements with no `drop policy if exists` collide (init_schema `:236ff`, avatars_storage `:10-40`, mitra_and_dispatch `:87-115`).
  - Comments in `lib/data/team.ts:569` ("avoid check constraint on role or missing columns") suggest production may be running SETUP_FULL. **Which schema is live is unknown.**
- **DB-002 (P1, CONFIRMED) — RLS gaps push the code onto the service role.**
  - Five tables have RLS enabled with no policies at all.
  - The migrations have no customer `SELECT` policy on orders, payments or subscriptions, and no profile self-read policy.
  - As a result, the code switched to the service role everywhere, which is why route-level gaps (Section 4) are directly exploitable.
  - Specific weak policies:
    - `worker_manage_own_profile … for all using (user_id = auth.uid())` (`mitra_and_dispatch.sql:96-97`) has no `WITH CHECK` or column guard. A worker can set their own `application_status='approved'` and `is_verified=true`.
    - `workers.application_status` defaults to `'approved'` (init).
    - `worker_update_job_offers` (`:92`) lets a worker set any status.
    - `public_read_workers` exposes phone and email to anonymous callers.
- **DB-003 (P1, CONFIRMED) — Non-atomic multi-writes with swallowed errors.**
  - `createCustomerOrder` (`lib/data/orders.ts:780-984`):
    - It creates the Midtrans transaction first, then inserts orders, photos, events and payments as separate calls.
    - The `payments` insert runs even when the order insert failed.
    - It returns `success:true` regardless of errors.
  - `transitionOrder` (`:443-456`) ignores `error` and has no `status = from` guard.
  - The webhook (`:85-127`) and admin customer delete (`app/api/admin/customers/route.ts:374-412`) both ignore errors.
  - supabase-js returns errors instead of throwing, so the surrounding `try/catch` blocks never fire.
- **DB-004 (P1, CONFIRMED) — Fallback attribution writes data to the wrong records.**
  - `lib/data/orders.ts:866-873`: if the caller's profile lookup fails, the order goes to *the first customer in `profiles`* or a hard-coded UUID.
  - Package fallbacks:
    - `:695` uses `pkgs[0]`;
    - `:883-904` uses an `ilike` name match or `b000…0001`;
    - `services.ts:166` sets `price || 100000`.
- **DB-005 (P1, CONFIRMED) — Non-UUID ids written to `uuid` columns.**
  - `lib/data/roles.ts:97` uses `role-${Date.now()}…` and `lib/data/content.ts:130` uses `faq-…`, so custom roles and new FAQs never persist.
  - The trigger casts `staff_role_id` with `::uuid` (staff migration `:99`), so inviting staff with a custom role fails.
- **DB-006 (P2, CONFIRMED) — Order codes are collision-prone and enumerable.**
  - Codes are `BM-YYMMDD-NNNN` with 4 random digits (`orders.ts:703-704`), i.e. 9,000 per day.
  - A collision violates the unique constraint, and that error is swallowed (DB-003).
- **DB-007 (P2, CONFIRMED) — Storage buckets are created at runtime and are public.**
  - `order-photos` and `services` are created by API routes with the service role and are not in the migrations.
  - `avatars` has no size or MIME limits.
  - On error, base64 data-URI fallbacks get stored in DB rows.
- **DB-008 (P2, PROBABLE) — Missing constraints and indexes.**
  - No unique `payments(kind, ref_id)` for active payments.
  - No unique open complaint per order.
  - `payments.ref_id` has no FK.
  - No ON DELETE rule on `orders.worker_id/package_id`, `payouts.worker_id` or `workers.reviewed_by`.
  - `categories` upsert on `slug` with a new `id` (`services.ts:336`).
  - Missing indexes: `payments(customer_id, kind, created_at)`, `payments(ref_id)`, `order_photos(order_id)`, `complaints(order_id)`, `worker_packages(package_id)`, `orders(package_id)`, `profiles(role)`.
  - No `updated_at` trigger on orders.
  - `orders.ts:925` writes the customer's chosen worker into `worker_id` instead of `preferred_worker_id`.
- **DB-009 (P3, CONFIRMED) — Smaller mismatches.**
  - The `completed_by` mapping puts system actors in as `'customer'` (`orders.ts:384`).
  - A fake phone `081200000000` is written for mitra drafts (`mitra.ts:194`).
  - Worker slugs `name-<uid[0:4]>` can collide.
  - `worker_packages` is deleted and re-inserted non-atomically.

**Migration-risk assessment:**
- Do **not** re-run any SQL file against production until the live schema has been dumped and diffed (see FP-07).
- The migrations are not idempotent.
- SETUP_FULL contains a privilege-granting seed.

---

## Section 4 — Authentication & Permission Audit

### Root findings

- **AUTH-001 (P0, PROBABLE) — Self-promotion to admin via `profiles` UPDATE policy.**
  - `SETUP_FULL_DATABASE.sql:278` reads `create policy user_update_own_profile on public.profiles for update using (id = auth.uid());`. There is no column restriction and no `WITH CHECK`.
  - Client code relies on own-row read and write with the anon key (`app/admin/settings/page.tsx:205-214`, `app/(auth)/login/page.tsx:67-71`), which suggests this policy is live.
  - Exploit: `PATCH /rest/v1/profiles?id=eq.<me>` with `{"role":"admin"}`. This makes `getUserPermissions` return super admin (`lib/supabase/auth.ts:45-47`) and opens every `admin_all_*` RLS policy.
  - SETUP_FULL (`:384-389`) also seeds `hajaraswad…` as `role='admin'`. The app only demotes that account in the OAuth/magic-link callback, so after a password login the account keeps DB-level admin.
- **AUTH-002 (P0, CONFIRMED in code; exploitability PROBABLE) — Role and staff status read from client-controlled `user_metadata`.**
  - Trigger: `handle_new_user` (staff migration `:93-103`) sets `role='staff'` and `staff_role_id` from `raw_user_meta_data`, which anyone sets on public `signUp`.
  - `lib/supabase/auth.ts:60-63` falls back to `user_metadata.role/staff_status/staff_role_id`.
  - `middleware.ts:118-136, 202-215` admits `/admin/*` purely on `meta.role === "staff"` without reading `profiles`.
  - `app/api/orders/route.ts:64-65` returns **every order plus customer emails** to any `role === "staff"`, with no permission or status check.
  - `POST /api/admin/accept-invite` → `lib/data/team.ts:546-565` lets **any logged-in user** set `user_metadata.staff_status='active', role='staff'`, with no invite check.
  - Conversely, it never sets `profiles.staff_status='active'` (`:570-577`), so legitimate invited staff can stay locked out (`auth.ts:62` prefers the profile value).
- **AUTH-003 (P1, CONFIRMED) — Unauthenticated email confirmation leads to account pre-hijack.**
  - `app/api/auth/verify-email/route.ts:4-28` takes any email, finds the user via `listUsers`, and sets `email_confirm:true`, with no session or OTP.
  - `POST /api/auth/register` also sets `email_confirm:true` (`register/route.ts:60`).
  - An attacker can register a victim's address and log in. Because admin status is granted by email, the same chain on a not-yet-created admin address yields super admin.
- **AUTH-004 (P1, CONFIRMED) — Hard-coded identity-based authorization.**
  - The super-admin email literal appears in `middleware.ts:105,197`, `lib/supabase/auth.ts:44,145`, `app/auth/callback/route.ts:102`, `app/api/orders/route.ts:31`, `app/api/admin/customers/route.ts:195,359`, `lib/auth/email-check.ts:18-20`, `lib/data/team.ts:28-30` and `scripts/*`.
  - It cannot be revoked and it overrides `profiles.role`.
  - `NEXT_PUBLIC_ADMIN_EMAIL` is both shipped to the browser and trusted for authorization.
- **AUTH-005 (P2, CONFIRMED) — Open redirects.**
  - The server only checks `startsWith("/") && !startsWith("//")` (`app/auth/callback/route.ts:18`, `middleware.ts:355-368`), so `/\evil.com` passes.
  - The client uses `next` unvalidated:
    - `app/admin/login/page.tsx:55,169` via `window.location.replace`;
    - `app/(auth)/verify-email/page.tsx:94` via `window.location.href`, which allows `javascript:`;
    - `app/(auth)/login/page.tsx:83-93` and `app/(customer)/welcome/page.tsx:97` via `router.push`.
  - The callback derives its origin from `x-forwarded-host` (`:13`).
- **AUTH-006 (P2, CONFIRMED) — Account enumeration and a fail-open, truncated user lookup.**
  - `POST /api/auth/check-email` returns the existing role for any email, and returns `available:true` on error.
  - Every `auth.admin.listUsers()` call is unpaginated, so it only sees the first 50 users: `email-check.ts:35`, `verify-email:15`, `customers/route.ts:86`, `orders/route.ts:80`, `team.ts:48`.
  - Past 50 users, the cross-role checks, customer emails and team lists are silently wrong.

### Permission enforcement findings

- **PERM-001 (P0, CONFIRMED) — Order IDOR.**
  - `GET /api/orders/[id]` (`app/api/orders/[id]/route.ts:5-11`) has **no auth**. It returns name, phone, address, photos and events, and order codes are enumerable (DB-006).
  - `cancel`, `confirm` and `complaint` check only that a user is logged in, never `order.customer_id === user.id`. Customer A can complete or cancel customer B's order, and completing releases the worker payout.
- **PERM-002 (P0, CONFIRMED) — Mitra API has no auth and no ownership.**
  - Every `/api/mitra/**` route uses `const workerId = user?.id || "w-1"`: `jobs/route.ts:17`, `jobs/[id]/route.ts:16`, `accept:16`, `decline:19`, `status:28`, `photos:17`, `earnings:15`.
  - There is no role check. `acceptMitraJob` and `updateMitraJobStatus` (`lib/data/mitra.ts:445-622`) never check `order.worker_id`.
  - `workerId` is the auth uid, while `orders.worker_id` references `workers.id`, so the comparison would be wrong even if added.
  - The photo route lets anonymous callers upload to a public bucket with the service role.
  - `PUT /api/mitra/application` upserts `workers` rows for any caller.
- **PERM-003 (P2, CONFIRMED) — `GET /api/admin/faq` is unauthenticated.**
  - It returns inactive FAQs (`app/api/admin/faq/route.ts:11-14`).
  - `getFaqItems(true)` overwrites the shared cache with active-only rows.

### Authorization matrix

| Resource / Route | Action | Expected | Actual check | Ownership | Finding |
|---|---|---|---|---|---|
| `/api/orders` | GET | customer: own; staff: `orders.view` | role from profile → user_metadata; any "staff" sees all | customer filter only | AUTH-002 |
| `/api/orders` | POST | customer | `getUser` | customerId = user.id (but fallback DB-004) | DB-004 |
| `/api/orders/[id]` | GET | owner / admin | **none** | **none** | PERM-001 |
| `/api/orders/[id]/pay` | POST | nobody (webhook only) | **none** | **none** | PAY-001 |
| `/api/orders/[id]/cancel`, `/confirm`, `/complaint` | POST | owner | `getUser` | **none** | PERM-001 |
| `/api/subscriptions/status` | POST | should not exist | `getUser` | any `sub_order_id` | PAY-003 |
| `/api/subscriptions/status` | GET | self | `getUser` | self (re-grants Plus) | PAY-003 |
| `/api/webhooks/midtrans` | POST | Midtrans (signed) | signature **optional** | n/a | PAY-002 |
| `/api/auth/verify-email` | POST | email owner | **none** | **none** | AUTH-003 |
| `/api/auth/check-email` | POST | public, generic answer | none; leaks role | n/a | AUTH-006 |
| `/api/admin/accept-invite` | POST | invited staff | `getUser` only | no invite check | AUTH-002 |
| `/api/admin/faq` | GET | `content.manage` | **none** | n/a | PERM-003 |
| `/api/admin/{content,customers,services,roles,team}` | all | permission / super admin | `requireApiPermission` / `requireApiSuperAdmin` | n/a | OK in code, but undermined by AUTH-001, AUTH-002 and AUTH-004 |
| `/api/admin/customers` | DELETE | super admin | super admin | target role not checked | ADMIN-001 |
| `/api/mitra/**` (all) | all | approved worker, assigned | **none** (`"w-1"` fallback) | **none** | PERM-002 |
| `/api/profile` | POST | self | `getUser`, field whitelist | self | OK |
| `/api/subscriptions/checkout`, `/api/me/permissions`, `/api/content`, `/api/services` | — | — | adequate | — | OK (`/api/services` returns inactive items: API-004) |
| `/admin/*` pages | view | admin / active staff | middleware: profile **or user_metadata** | n/a | AUTH-002 |

**Requires product clarification:**
- Should staff with `orders.view` see customer emails?
- May customers cancel after `paid`?
- What is the refund policy?

---

## Section 5 — General Codebase Findings

### Payments and subscriptions

- **PAY-001 (P0, CONFIRMED) — Unauthenticated "mark as paid".**
  - `app/api/orders/[id]/pay/route.ts:5-46` has no auth and calls `transitionOrder(…, "paid", "webhook")`, then a DB update.
- **PAY-002 (P0, CONFIRMED) — Webhook signature bypass, filter injection, unenforced amount.**
  - `app/api/webhooks/midtrans/route.ts:23` only verifies when `signature_key` is present, and fails open when the server key is missing or a dummy.
  - The comparison uses `!==`.
  - `order_id` is interpolated into `.or(...)` (`:55-58`).
  - An amount mismatch only triggers `console.warn` (`:69-73`).
  - `lib/midtrans.ts:58` silently overwrites `gross_amount` with the item sum.
- **PAY-003 (P0, CONFIRMED) — Plus can be obtained without paying, and extended forever.**
  - `POST /api/subscriptions/status` (`:152-187`) upserts Plus for any user and marks any `sub_order_id` as success. It is called from the client in `app/plus/page.tsx:86`.
  - `GET` (`:48-65`) re-grants +30 days from any historical successful payment.
  - The webhook (`:178-197`) adds days on every success notification. It is not idempotent: `capture` then `settlement`, or retries, stack.
  - Three writers use conflicting formulas (stack vs `now + 30`).
- **PAY-004 (P1, CONFIRMED) — Ledger and order integrity under real notification sequences.**
  - The `payments` update is unconditional (`webhook :139-155`). A late `pending`/`expire` overwrites `success`, and `refund`/`chargeback` map to `pending`.
  - Customer cancel never cancels the Snap transaction. A later settlement then marks the payment success while the order stays cancelled, so money is captured with no flag.
  - Duplicate `order_events` occur (webhook plus `transitionOrder`).

### Business logic and state (in-memory / mock)

- **ARCH-001 (P0, CONFIRMED) — In-memory/mock state used as the database in production.**
  - Order transitions validate against `inMemoryOrders` (`lib/data/orders.ts:357-366, 296-297, 337`).
  - All mitra job functions operate on `MOCK_ORDERS` (`lib/data/mitra.ts:380, 430, 449, 502, 533, 633`).
  - The admin order detail page is a client component that imports and runs `transitionOrder`, `manualAssignWorker`, `resolveComplaint`, `replaceWorker`, `retryDispatch` and `releaseWorkerAndRedispatch` in the browser (`app/admin/orders/[id]/page.tsx:16-22, 170, 215, 277, 330, 349, 373`). The DB sync is skipped when `typeof window !== "undefined"` (`orders.ts:421`).
  - `retryDispatch` offers the job to a fake candidate (`orders.ts:621-630`).
  - Mock orders are merged into real lists (`api/orders/route.ts:112-121`, `orders.ts:185-186`).
  - The dashboard always returns `getMockDashboardStats` (`lib/data/dashboard.ts:8`).
  - Payouts and transactions are mocks.
  - `GET /api/admin/customers` returns `MOCK_CUSTOMERS` when the DB has none (`:233-237`).
  - `getCategories` merges mock categories (`services.ts:93-97`), and mock packages are orderable at mock prices.
  - Impact: paid orders cannot progress past `paid`, and admins see fabricated orders and KPIs.
- **ARCH-002 (P1, CONFIRMED) — Stale-state race in transitions.**
  - Instance A holds an in-memory `pending_payment` copy. The webhook on instance B marks the order paid. A customer cancel that lands on A passes `canTransition` and overwrites a **paid** order to `cancelled`, because the DB update has no `.eq("status", from)`.
  - The same pattern applies to double-accept (`mitra.ts:454`); the DB partial unique index on `job_offers` is unused.
- **BIZ-001 (P1, CONFIRMED) — No payouts or commission.**
  - Nothing inserts into `payouts`.
  - `markPayoutAsPaid` mutates mock data with `paid_by:"adm-1"`.
  - `getMitraEarnings` returns constants (`mitra.ts:680-738`).
  - Dashboard stats substitute fake numbers when the value is 0 (`mitra.ts:333-344`).
  - Month buckets use UTC instead of WIB.
- **BIZ-002 (P2, CONFIRMED) — Divergent transition rules.**
  - `updateMitraJobStatus` reimplements the transitions.
  - `releaseWorkerAndRedispatch` performs `worker_confirmed → paid`, which `TRANSITIONS` does not allow.
  - `resolveComplaint("cancel_refund")` attempts `awaiting_confirmation → cancelled` (not allowed) after closing the complaint, and no refund is issued.
  - Complaints are accepted in any status, and `is_warranty` comes from the client.
- **API-001 (P2, CONFIRMED) — Idempotency key ignored.**
  - The client sends `idempotency_key` (`app/order/[packageId]/page.tsx:253`); the server ignores it, so a double submit creates two orders and two Snap transactions.
- **API-002 (P2, CONFIRMED) — Unbounded reads.**
  - `GET /api/orders` loads all orders with joins and filters them in JS.
  - Admin orders "pagination" is static (`app/admin/orders/page.tsx:556-577`).
- **API-003 (P2, CONFIRMED) — PostgREST filter injection.**
  - `getWorkers` interpolates the search term into `.or()` (`lib/data/workers.ts:31`). The webhook has the same pattern (PAY-002).
- **API-004 (P2, CONFIRMED) — Inactive catalog exposed and orderable.**
  - Public `/api/services` uses the service role and never filters `is_active`. `getPackageById` returns inactive packages, which can then be ordered.

### Admin

- **ADMIN-001 (P1, CONFIRMED) — Customer DELETE hard-deletes financial history.**
  - It deletes subscriptions, payments, orders (cascading to payouts), workers, profiles and the auth user, in sequence (`app/api/admin/customers/route.ts:374-412`).
  - Errors are ignored and it always reports success.
  - The target's role is not checked.
  - There is no audit entry.
  - Grant and revoke Plus are not audited, and `days` is not validated.
- **ADMIN-002 (P1, CONFIRMED) — Service writes fail silently and lose fields.**
  - Upsert errors are unchecked (`services.ts:336, 423`).
  - `image_url`, `badge` and `worker_count` are never written to the DB.
  - An unknown category falls back to the Plumbing category.
  - Deletes always return true.
- **ADMIN-003 (P2, CONFIRMED) — Upload validation.**
  - Uploads trust the client-supplied MIME type.
  - The extension comes from the raw filename.
  - Buckets are created at runtime.
  - On error, a base64 data URI is stored in the DB.
  - GIF is allowed, contrary to the spec (`app/api/admin/content/upload/route.ts:20-37`, `services/upload/route.ts:21-41`).
- **ADMIN-004 (P2, CONFIRMED) — No input validation library in use.**
  - `zod` is never imported, although the spec requires it (SPEC_ADMIN:1248, 1520).
  - The CMS `announcement.link` is rendered as `href` (`components/customer/CustomerShell.tsx:230`) with no scheme check.
- **ADMIN-005 (P2, CONFIRMED) — Inconsistent audit logging.**
  - Content updates are logged twice.
  - Services, FAQ reorder, uploads and customer actions are not logged.
  - The fallback log lives in memory.
- **ADMIN-006 (P3, CONFIRMED) — CSV export.**
  - `DashboardExportModal.tsx:110-128` does not escape `"` and does not neutralise leading `= + - @`.
  - It calls `revokeObjectURL` synchronously after `click()`.
- **ADMIN-007 (P3, CONFIRMED) — Error leakage.**
  - Raw `err.message` and PostgREST errors are returned to clients.
  - `cancel-email-change` returns the full user object.

### Frontend

- **FE-001 (P1, CONFIRMED) — Snap script hard-coded to sandbox.**
  - `app/payment/[orderId]/page.tsx:228`, `app/order/[packageId]/page.tsx:813` and `app/plus/page.tsx:356` load the sandbox script, while the server switches on `MIDTRANS_IS_PRODUCTION` (`lib/midtrans.ts:41-44`).
- **FE-002 (P2, CONFIRMED) — Scheduled date off by one in WIB.**
  - The label shows the local date, but the submitted value is `toISOString().split("T")[0]` (UTC) (`app/order/[packageId]/page.tsx:69-75`).
  - The server does not validate `scheduled_date`.
- **FE-003 (P2, CONFIRMED) — Payment page sync.**
  - The realtime subscription can never fire: there is no customer SELECT policy and no publication.
  - Polling stops after 60 s.
  - The countdown is fixed and fake (`:43`).
  - "Resume payment" fails for any order read from the DB, because the snap token is not stored on `orders` (`:198-201`).
- **FE-004 (P2, CONFIRMED) — Mitra registration uses mock catalog IDs.**
  - `app/mitra/daftar/page.tsx:9,37,228,404,595` uses `MOCK_CATEGORIES`/`MOCK_PACKAGES` and `["pkg-1"]`.
- **FE-005 (P3, CONFIRMED) — Broken link and missing error boundaries.**
  - `href="/services"` points to a route that does not exist (`app/payment/[orderId]/page.tsx:260`).
  - There are no `error.tsx`, `not-found.tsx` or `loading.tsx` files.
- **FE-006 (P3, CONFIRMED) — Lint and React Compiler errors.**
  - 421 lint problems in total.
  - About 25 "setState in effect" errors.
  - Refs read during render (`BeforeAfterSlider.tsx:87-88`).
  - Use before declaration with a stale closure (`components/mitra/SlideToConfirm.tsx:50`).
- **FE-007 (P3, CONFIRMED) — Password change.**
  - It does not re-verify the current password and enforces length only, whereas the spec requires upper, lower and digit.

### Configuration

- **CONFIG-001 (P2, CONFIRMED) — No security headers or CSRF protection.**
  - There is no CSP, frame-ancestors, HSTS, Referrer-Policy or Permissions-Policy, so the admin panel can be framed.
  - Cookie-authenticated mutations have no Origin check.
- **CONFIG-002 (P3, CONFIRMED) — Environment and secrets.**
  - `.env.local` is correctly ignored and was never committed.
  - `.env.example` contains real personal email addresses.
  - `scripts/test-accept-invite.ts:60` has a hard-coded password literal.
  - `scripts/create-admin.ts` prints a live recovery link.
  - `SETUP_FULL_DATABASE.sql:4` contains the project ref.
- **CONFIG-003 (P3, CONFIRMED) — Deprecated `middleware.ts` and overstated docs.**
  - `middleware.ts` should be migrated to `proxy.ts`.
  - `docs/BUILD_STATUS.md` marks mock-backed features as "FINAL & Siap Pakai" (final and ready to use).
- **TEST-001 (P2, CONFIRMED) — No tests and no CI.**
  - `scripts/test-*.ts` write to the real DB with the service-role key.
  - `npm run lint` fails.

---

## Section 6 — Consolidated Issue Registry

| ID | Issue | Sev | Conf. | Root cause | Affected modules | Depends on |
|---|---|---|---|---|---|---|
| PAY-001 | Unauthenticated `/pay` marks orders paid | P0 | Confirmed | Sandbox simulator left in prod | Orders, dispatch, payouts | — |
| PAY-002 | Webhook signature optional, filter injection, amount unchecked | P0 | Confirmed | Fail-open verification | Orders, Plus | — |
| PAY-003 | Free / perpetual Plus | P0 | Confirmed | Activation not bound to one verified payment | Plus, order pricing | PAY-002 |
| PERM-001 | Order IDOR (read + mutate) | P0 | Confirmed | No ownership checks; service role | Orders, PII | DB-006 |
| AUTH-001 | Self-update `profiles.role` → admin | P0 | Probable | Unrestricted RLS UPDATE in SETUP_FULL | Everything admin | DB-001 |
| AUTH-002 | Role from `user_metadata`; staff via signup; accept-invite with no invite | P0 | Confirmed (code) | No single trusted role source | Middleware, admin, orders | AUTH-001 |
| PERM-002 | Mitra API no auth, no ownership, `"w-1"` fallback | P0 | Confirmed | Mock-era defaults kept | Mitra, storage | ARCH-001 |
| ARCH-001 | In-memory/mock as source of truth; admin actions in the browser | P0 | Confirmed | Prototype data layer never replaced | Orders, mitra, admin, dashboard, payouts | DB-001, DB-002 |
| AUTH-003 | Unauthenticated email confirm → account pre-hijack | P1 | Confirmed | Convenience endpoint | Auth, admin (via AUTH-004) | — |
| AUTH-004 | Hard-coded admin emails | P1 | Confirmed | Identity-based authz | All authz | AUTH-002 |
| DB-001 | Schema drift: two sources of truth, non-idempotent | P1 | Confirmed | SETUP_FULL never regenerated | DB | — |
| DB-002 | RLS gaps, worker self-approve, public PII | P1 | Confirmed | Policies incomplete | DB, mitra | DB-001 |
| DB-003 | Non-atomic writes, swallowed errors | P1 | Confirmed | No RPC/transactions; `{error}` ignored | Orders, webhook, admin | — |
| DB-004 | Orders attributed to wrong customer/package | P1 | Confirmed | Silent fallbacks | Orders, billing | DB-003 |
| DB-005 | Non-UUID ids for uuid columns | P1 | Confirmed | Mock id format | Roles, FAQ, staff invite | — |
| PAY-004 | Ledger downgrade, paid-after-cancel, no refunds | P1 | Confirmed | No payment state machine | Payments | PAY-002 |
| ARCH-002 | Stale-state race in transitions / accept | P1 | Confirmed | No conditional update | Orders, mitra | ARCH-001 |
| BIZ-001 | No payouts/commission; fake earnings | P1 | Confirmed | Not implemented | Mitra, finance | ARCH-001 |
| ADMIN-001 | Customer delete destroys ledger | P1 | Confirmed | Hard delete, no transaction | Admin, finance | DB-003 |
| ADMIN-002 | Service writes silently fail / lose fields | P1 | Confirmed | `{error}` ignored; partial column mapping | Catalog | — |
| FE-001 | Sandbox Snap hard-coded | P1 | Confirmed | Literal URL | Payments | — |
| AUTH-005 | Open redirects | P2 | Confirmed | Weak/missing `next` validation | Auth | — |
| AUTH-006 | Email enumeration; `listUsers` capped at 50 | P2 | Confirmed | No paginated/lookup API | Auth, admin | — |
| PERM-003 | Admin FAQ GET public; cache corruption | P2 | Confirmed | Missing guard | CMS | — |
| DB-006 | Enumerable / colliding order codes | P2 | Confirmed | 4 random digits | Orders | — |
| DB-007 | Runtime public buckets, base64 fallbacks | P2 | Confirmed | Buckets not in migrations | Storage | — |
| DB-008 | Missing constraints / indexes | P2 | Probable | Schema incomplete | DB | DB-001 |
| BIZ-002 | Divergent transition rules | P2 | Confirmed | Duplicated logic | Orders, mitra, admin | ARCH-001 |
| API-001 | Idempotency key ignored | P2 | Confirmed | Not implemented | Orders | DB-003 |
| API-002 | Unbounded reads, fake pagination | P2 | Confirmed | JS-side filtering | Admin orders | — |
| API-003 | PostgREST `.or()` injection | P2 | Confirmed | String interpolation | Search, webhook | — |
| API-004 | Inactive catalog exposed / orderable | P2 | Confirmed | Service role, no filter | Catalog, orders | — |
| ADMIN-003 | Upload validation | P2 | Confirmed | Trusts client MIME/name | Admin uploads | DB-007 |
| ADMIN-004 | No zod validation; unsafe CMS link | P2 | Confirmed | Not implemented | Admin APIs | — |
| ADMIN-005 | Inconsistent audit log | P2 | Confirmed | Ad-hoc logging | Admin | — |
| FE-002 | WIB date off by one; no server validation | P2 | Confirmed | `toISOString` | Order form | — |
| FE-003 | Payment page realtime/poll/resume broken | P2 | Confirmed | No RLS/publication; token not stored | Payment UX | DB-002 |
| FE-004 | Mitra registration uses mock IDs | P2 | Confirmed | Mock import | Mitra onboarding | — |
| CONFIG-001 | No security headers / CSRF | P2 | Confirmed | Not configured | All | — |
| TEST-001 | No tests/CI; scripts hit live DB | P2 | Confirmed | — | All | — |
| DB-009, ADMIN-006, ADMIN-007, FE-005, FE-006, FE-007, CONFIG-002, CONFIG-003 | Minor issues (see Section 5) | P3 | Confirmed | Various | Various | — |

**Common root causes:**
- **(R1) Mock/prototype data layer still in production paths:** ARCH-001, ARCH-002, BIZ-001, BIZ-002, FE-004, PERM-002, ADMIN-002, PAY-001.
- **(R2) No single trusted identity/role source:** AUTH-001, AUTH-002, AUTH-004, part of PERM-001.
- **(R3) Service role everywhere with incomplete RLS:** PERM-001, PERM-002, DB-002, API-004.
- **(R4) Supabase `{error}` ignored and no transactions:** DB-003, DB-004, ADMIN-001, ADMIN-002, PAY-004.
- **(R5) Schema drift:** DB-001, DB-005, DB-008.

---

## Section 7 — Evidence & Reproduction

Run these against a **local or staging** deployment only, never production.

| Finding | Reproduction | Expected | Actual |
|---|---|---|---|
| PAY-001 | `curl -X POST http://localhost:3000/api/orders/<order_code>/pay -H 'content-type: application/json' -d '{}'` with no cookies | 401/404 | Order → `paid` |
| PAY-002 | `curl -X POST …/api/webhooks/midtrans -d '{"order_id":"ORD-<code>","transaction_status":"settlement","status_code":"200","gross_amount":"1"}'` (no `signature_key`) | 401 | Order → `paid` |
| PAY-003 | Logged in as a fresh customer: `fetch('/api/subscriptions/status',{method:'POST'})` | 403/405 | `subscriptions.plan='plus'` for 30 days |
| PERM-001 | `curl …/api/orders/<code>` with no cookies; then, as customer B, `POST /api/orders/<A's id>/cancel` | 401 / 403 | Full order JSON / A's order cancelled |
| PERM-002 | `curl …/api/mitra/jobs` with no cookies | 401 | Job list (mock) for `w-1` |
| AUTH-001 | As a customer JWT: `PATCH $SUPABASE_URL/rest/v1/profiles?id=eq.<uid>` with `{"role":"admin"}` | RLS rejects | Succeeds if SETUP_FULL policy is live |
| AUTH-002 | `supabase.auth.signUp({email,password,options:{data:{signup_as:'staff',staff_role_id:'00000000-0000-0000-0000-000000000002'}}})`, then `GET /api/orders` | Customer, own orders only | `role='staff'` → all orders + emails |
| AUTH-003 | `signUp(victim@…)`, then `POST /api/auth/verify-email {"email":"victim@…"}`, then log in | Email must be proven | Login succeeds |
| ARCH-002 | Two instances: create order on A; webhook paid via B; cancel via A | Cancel rejected | Paid order becomes `cancelled` |
| FE-002 | Set system TZ to Asia/Jakarta at 02:00; choose tomorrow | Stored = tomorrow | Stored = today |

Read-only live checks needed to settle the PROBABLE items:

```sql
select polname, polcmd, pg_get_expr(polqual, polrelid) qual, pg_get_expr(polwithcheck, polrelid) chk
from pg_policy where polrelid = 'public.profiles'::regclass;
select pg_get_functiondef('public.handle_new_user'::regproc);
select tablename from pg_tables t where schemaname='public' and rowsecurity
  and not exists (select 1 from pg_policies p where p.tablename=t.tablename);
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
select id, role from public.profiles where role in ('admin','staff');
```

---

## Section 8 — Prioritized Remediation Roadmap

| # | Fix prompt | Findings | Priority | Blocks | Can run independently? | Validation before proceeding |
|---|---|---|---|---|---|---|
| 0 | Live DB inventory (manual, read-only SQL above) | AUTH-001, DB-001 | P0 | FP-04, FP-07 | Yes | Policy/trigger dump saved |
| 1 | FP-01 Payment integrity | PAY-001, PAY-002, PAY-004 | P0 | FP-02, FP-08 | Yes | Forged webhook rejected; signed one accepted |
| 2 | FP-02 Plus activation | PAY-003 | P0 | — | After FP-01 (shares webhook file) | Single payment ⇒ exactly one extension |
| 3 | FP-03 Order route authz | PERM-001, DB-006 (format) | P0 | — | Yes | Cross-customer requests → 403 |
| 4 | FP-04 Trusted role source | AUTH-001, AUTH-002, AUTH-004 | P0 | FP-06, FP-10 | Yes (touches auth.ts, middleware, callback, team, SQL) | Metadata tampering no longer grants access |
| 5 | FP-05 Email verify / enumeration | AUTH-003, AUTH-006 | P1 | — | Yes | Unauthenticated confirm impossible |
| 6 | FP-06 Mitra API auth | PERM-002 | P0 | FP-09 | After FP-04 | Anonymous → 401; non-assigned → 403 |
| 7 | FP-07 Schema source of truth + RLS | DB-001, DB-002, DB-007, DB-008 | P1 | FP-08, FP-09, FP-10 | After step 0 | `supabase db diff` clean on staging |
| 8 | FP-08 Transactional order core | DB-003, DB-004, DB-006, ARCH-002, API-001, API-004 | P1 | FP-09, FP-10 | After FP-01, FP-07 | Concurrency tests pass |
| 9 | FP-09 Dispatch, mitra lifecycle, payouts on DB | ARCH-001 (mitra), BIZ-001, BIZ-002, FE-004 | P1 | — | After FP-06, FP-08 | E2E order reaches `completed` with a payout row |
| 10 | FP-10 Admin to server routes; remove mock from prod | ARCH-001 (admin), ADMIN-002, DB-005, PERM-003 | P1 | — | After FP-08 | Admin actions persist across instances |
| 11 | FP-11 Customer delete, validation, audit | ADMIN-001, ADMIN-004, ADMIN-005, ADMIN-007 | P1 | — | Yes | Ledger rows preserved |
| 12 | FP-12 Redirects, headers, uploads | AUTH-005, CONFIG-001, ADMIN-003, API-003 | P2 | — | Yes | Redirect/header tests |
| 13 | FP-13 Frontend payment and date | FE-001, FE-002, FE-003, FE-005 | P2 | — | After FP-08 (token storage) | Manual + unit tests |
| 14 | FP-14 Test harness and CI | TEST-001, FE-006 | P2 | Ideally first, in parallel | Yes | CI green |

Do not run FP-04, FP-07 and FP-08 in parallel: they share `profiles`, the RLS policies and `lib/data/orders.ts`.

---

## Section 9 — Detailed Fix Prompts

Common rules apply to **every** prompt. Each prompt below repeats "Apply the Common Constraints".

```text
COMMON CONSTRAINTS (apply to every fix prompt)
- Repo: D:\BuildMate V.2 — Next.js 16.4 App Router + Supabase. Read AGENTS.md and the relevant guide in node_modules/next/dist/docs/ before writing Next.js code (APIs differ from older versions; middleware is now "proxy").
- Inspect every file you change in full before editing. Do not invent file paths, columns or functions; if something referenced below no longer matches, re-locate it and note the difference.
- No unrelated refactoring. Preserve existing API response shapes ({ success, ... } / { error }) unless the prompt says otherwise.
- supabase-js returns { data, error } and does NOT throw: check `error` on every call you touch and fail the request (non-2xx) when a write fails.
- Never bypass authorization or weaken validation to make a test pass. Never replace real DB behaviour with mock data.
- Database: never drop, truncate, reset or recreate data. New SQL goes in a NEW timestamped file under supabase/migrations/, must be idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE), and must not be executed by you against any remote project. Provide a rollback SQL snippet in the migration header comment.
- Do not print or commit secrets. Refer to env vars by name.
- Do not claim completion without test evidence. Final report: files changed, root cause resolved, DB changes, tests run + actual output, regression risks, remaining issues, manual deploy/migration steps.
```

### FP-01 — Payment integrity (PAY-001, PAY-002, PAY-004) · P0

```text
TASK: FP-01 Payment integrity — findings PAY-001, PAY-002, PAY-004 (P0/P1). Apply the Common Constraints.

CONTEXT
- app/api/orders/[id]/pay/route.ts (whole file): unauthenticated "QRIS simulator" that calls transitionOrder(order.id,"paid","webhook",…) then updates orders.status='paid' via createAdminClient().
- app/api/webhooks/midtrans/route.ts:
  - :23 verifies the signature only `if (serverKey && serverKey !== "dummy-midtrans-server-key" && signature_key)`; comparison uses !== (:29);
  - :55-58 interpolates order_id into .or(`order_code.eq.${…}`);
  - :69-73 only console.warn on amount mismatch;
  - :83-127 order update and event insert with no error checks;
  - :139-155 unconditional payments update (pending/expire can overwrite success; refund/chargeback map to 'pending');
  - :160-198 SUB-* handling (leave to FP-02, but keep the structure compatible).
- lib/midtrans.ts: createMidtransSnapTransaction (:58 overwrites gross_amount with the item sum); an unused verifyMidtransSignature exists (~:120).
- Tables: orders(status, total, order_code), payments(provider_order_id unique, status, amount, kind, ref_id), order_events.
- Order statuses/transitions: lib/orders/transitions.ts.
- Customer cancel: app/api/orders/[id]/cancel/route.ts.

PROBLEM
Anyone can mark an order paid (no auth on /pay; webhook accepts unsigned bodies). Paid amount is not enforced. Payment ledger can be downgraded by late notifications; payment after cancellation is captured silently.

DESIRED BEHAVIOUR
1. /api/orders/[id]/pay no longer exists in production builds. Preferred: delete the route and remove its callers (grep for "/pay" in app/payment and app/order). If the sandbox simulator is needed for local dev, keep it only when process.env.NODE_ENV !== "production" AND MIDTRANS_IS_PRODUCTION !== "true" AND the caller is an authenticated admin (requireApiPermission from lib/supabase/auth.ts); otherwise 404.
2. Webhook:
   - If MIDTRANS_SERVER_KEY is unset → respond 500 and do nothing.
   - If signature_key is missing or invalid → 401 and do nothing.
   - Verify sha512(order_id + status_code + gross_amount + serverKey) using crypto.timingSafeEqual on equal-length Buffers; reuse/fix verifyMidtransSignature in lib/midtrans.ts.
   - Validate order_id against /^(ORD-[A-Z0-9-]+|SUB-[A-Za-z0-9-]+)$/ and query with .eq("order_code", code) — no string-built .or() filters.
   - For ORD-*, compare Number(gross_amount) to orders.total (and payments.amount). On mismatch: do not mark paid; record an order_event/admin flag; respond 200 so Midtrans stops retrying, and log.
   - Payment state machine: pending→success|failed|expired; success→refunded|partially_refunded|chargeback. Apply payments updates with a status guard (e.g. .eq("status","pending") for success/failed), never downgrade success to pending/failed. Map refund/partial_refund/chargeback explicitly.
   - Order update must be conditional: update orders set status='paid' where id=… and status='pending_payment' (use .eq("status","pending_payment").select()). Insert exactly one order_event only when that update affected a row (no second event from transitionOrder).
   - If a success notification arrives for a cancelled order: keep the order cancelled, mark the payment success, write an order_event / admin_audit entry "paid_after_cancel" for manual refund.
   - Check every Supabase error; on a DB failure return 500 so Midtrans retries.
3. lib/midtrans.ts: if gross_amount != sum(item_details) throw instead of silently rewriting.
4. Customer cancel of a pending_payment order should call the Midtrans cancel/expire API for that order_id (add a helper in lib/midtrans.ts; tolerate 404 "transaction not found").

TESTS (add a test runner if FP-14 not done yet: vitest; mock Supabase + fetch)
- Unsigned webhook → 401, no DB writes. Wrong signature → 401. Missing server key → 500.
- Valid signature, settlement, correct amount → order paid, one event, payment success.
- Same notification replayed → no second event; idempotent.
- Valid signature, wrong amount → order stays pending_payment, flag recorded.
- pending notification after settlement → payment stays success.
- settlement for cancelled order → order stays cancelled; flag recorded.
- order_id containing ",id.eq." → rejected 400.
- POST /api/orders/<id>/pay in production mode → 404.

ACCEPTANCE CRITERIA
- No code path other than a verified webhook (or the server-side Midtrans status sync in GET /api/orders/[id], which must also verify the amount) can set orders.status='paid'.
- All tests above pass; npx tsc --noEmit passes.

SECURITY: trusted identity for the webhook is the Midtrans signature only. Do not trust any client-sent status.
```

### FP-02 — Plus subscription activation (PAY-003) · P0

```text
TASK: FP-02 Member Plus activation — finding PAY-003 (P0). Prerequisite: FP-01 merged (shared webhook file). Apply the Common Constraints.

CONTEXT
- app/api/subscriptions/status/route.ts:
  - POST (:152-187) grants plan 'plus' for now+PLUS_DURATION_DAYS to any logged-in user and marks any body.sub_order_id payment 'success' without an owner check.
  - GET (:48-65, :96-117) re-grants now+30d when any of the last 3 subscription payments has status 'success'.
- app/plus/page.tsx:86 calls the POST from the Snap onSuccess callback.
- app/api/webhooks/midtrans/route.ts:160-198 extends current_period_end by PLUS_DURATION_DAYS on every success notification (capture + settlement + retries stack).
- app/api/subscriptions/checkout/route.ts creates the SUB-* payment.
- Tables: subscriptions(user_id PK, plan, current_period_end), payments(kind='subscription', provider_order_id, customer_id, status, amount).
- Plus effects: service-fee waiver in lib/data/orders.ts (~:707) and app/api/orders/route.ts (:248-252); Plus is checked inconsistently (null current_period_end treated as active forever at orders.ts:175,334 and api/orders/route.ts:98).

DESIRED BEHAVIOUR
1. Remove the POST handler (return 405), and update app/plus/page.tsx to poll GET /api/subscriptions/status after onSuccess instead.
2. Create one server function activatePlusForPayment(providerOrderId) (e.g. lib/data/subscriptions.ts):
   - Atomically flip payments.status pending→success with .eq("status","pending").select(). Only if exactly one row changed:
     - verify kind='subscription' and amount == PLUS_PRICE;
     - set current_period_end = max(now, existing current_period_end) + PLUS_DURATION_DAYS;
     - record the granted period on the payment (e.g. metadata or a new nullable column via migration).
   - Prefer implementing this as a Postgres function (security definer, set search_path = public) so the payment flip and subscription update are one transaction.
3. Call it from the webhook (signature verified per FP-01) and, optionally, from GET status when a pending SUB payment of THIS user is confirmed settled via a server-side Midtrans status API call.
4. GET must never grant from historical payments; it only reads subscriptions and reports active = plan='plus' AND current_period_end > now().
5. Unify the "is Plus active" check into one helper used by lib/data/orders.ts and app/api/orders/route.ts (null end date = NOT active).

TESTS
- Customer POST → 405, subscriptions unchanged.
- One payment with capture then settlement notifications → exactly one extension.
- Renewal with 20 days left → 50 days.
- Expired Plus + old success payment → GET reports inactive and does not re-grant.
- Payment of another user cannot affect the caller.

ACCEPTANCE: Plus can only be obtained through a verified, amount-checked payment, exactly once per payment.
```

### FP-03 — Order route authorization (PERM-001, DB-006) · P0

```text
TASK: FP-03 Order endpoint authorization — PERM-001 (P0), DB-006 (P2). Apply the Common Constraints.

CONTEXT
- app/api/orders/[id]/route.ts:5-11 GET — no auth; returns getOrderById(id) (lib/data/orders.ts) with customer name/phone/address, photos, events, complaints. Also performs a Midtrans status sync (:14-67).
- app/api/orders/[id]/cancel/route.ts:16-35, confirm/route.ts:16-28, complaint/route.ts:16-41 — getUser() only, no comparison with order.customer_id.
- getOrderById accepts a UUID or order_code (orders.ts ~:296-337).
- Order code generation: lib/data/orders.ts:703-704 ("BM-YYMMDD-" + 4 random digits).
- Permission helpers: lib/supabase/auth.ts (getUserPermissions, requireApiPermission). Admin permission names are in lib/auth/permissions.ts (e.g. "orders.view"/"orders.manage" — verify exact names there).

DESIRED BEHAVIOUR
1. Add a shared helper (e.g. lib/orders/access.ts) authorizeOrderAccess(orderIdOrCode, mode: "read"|"customer_action"):
   - resolves the user with supabase.auth.getUser() (server client);
   - loads the order FROM THE DATABASE (service role), not from in-memory caches;
   - allows: the owning customer (orders.customer_id === user.id); admin/staff holding the relevant permission via getUserPermissions (read → orders.view; admin actions handled elsewhere); for read only, the assigned worker (workers.user_id === user.id AND orders.worker_id = workers.id).
   - Returns 401 if unauthenticated, 404 if the order does not exist OR the caller is not allowed (avoid confirming existence).
2. Use it in GET /api/orders/[id] and in cancel/confirm/complaint (customer_action = owner only).
3. Server-side status checks: cancel only from statuses allowed by lib/orders/transitions.ts for actor "customer"; complaint only in awaiting_confirmation/completed (confirm the intended statuses with docs/spec/SPEC_CUSTOMER.md); ignore client-provided is_warranty — compute it server-side from the customer's Plus status.
4. Do not include other customers' data. Reduce the GET response to fields the UI needs (check app/orders/[id]/page.tsx and app/payment/[orderId]/page.tsx).
5. Order codes: make new codes non-enumerable (e.g. BM-YYMMDD- + 8 chars of crypto-random base32) and retry on unique violation (23505). Do not change existing codes; ensure parsers/regexes (webhook, getOrderById) accept both formats.

TESTS
- Anonymous GET → 401. Customer B GET A's order → 404. Owner → 200. Admin with orders.view → 200.
- B cancel/confirm/complaint on A's order → 404 and no DB change.
- Complaint on pending_payment → 400. Client is_warranty=true for non-Plus → stored false.
- Code generator: 10k codes, no collisions in test; old-format codes still resolvable.

ACCEPTANCE: every /api/orders/[id]/* handler enforces ownership server-side; tests pass.
```

### FP-04 — One trusted role source; close privilege escalation (AUTH-001, AUTH-002, AUTH-004) · P0

```text
TASK: FP-04 Trusted identity & role source — AUTH-001, AUTH-002, AUTH-004. Prerequisite: the live DB policy/trigger dump (audit Section 7 SQL) is available, so you know whether SETUP_FULL's policies are live. Apply the Common Constraints.

CONTEXT (verified line refs at commit 8694cd8)
- supabase/SETUP_FULL_DATABASE.sql:278 `create policy user_update_own_profile on public.profiles for update using (id = auth.uid());` (no column guard); :384-389 seeds a hard-coded email as role 'admin'.
- supabase/migrations/20261013000000_staff_and_permissions.sql:85-103 handle_new_user sets role 'staff' and staff_role_id from raw_user_meta_data (client-controlled at signUp).
- lib/supabase/auth.ts:40-47 super admin = configured/hard-coded emails OR profile.role==='admin'; :60-63 falls back to user.user_metadata.role/signup_as/staff_status/staff_role_id; :133-146 more email literals.
- middleware.ts:93-136 and :186-231 trust user_metadata.role==='staff' and email literals; matcher at :418-432.
- app/auth/callback/route.ts:80-104, :149-174, :207 same pattern.
- app/api/orders/route.ts:28-44, :64-65 hand-rolled role check; any "staff" sees all orders and customer emails.
- app/api/admin/accept-invite/route.ts + lib/data/team.ts:540-580 acceptStaffInvite: any logged-in user gets user_metadata {role:'staff', staff_status:'active'}; profiles.staff_status is never set to 'active' (legit staff stay 'invited').
- Hard-coded emails also in app/api/admin/customers/route.ts:195,359, lib/auth/email-check.ts:18-20, lib/data/team.ts:28-30, app/admin/login/page.tsx:31-39,121-125, app/admin/settings/page.tsx:35,84, scripts/create-admin.ts:30, scripts/set-admin-password.ts:29.
- Client code writes profiles from the browser: app/admin/settings/page.tsx:205-214, app/(customer)/welcome/page.tsx, app/(auth)/login/page.tsx:67-71 (reads).

DESIRED BEHAVIOUR
1. Single source of truth: public.profiles (role, staff_status, staff_role_id), read server-side with the service-role client. user_metadata is NEVER used for authorization anywhere (it may still be used for display name/avatar). Email literals are removed from authorization logic.
2. Super admin = profiles.role = 'admin'. Bootstrap admins via scripts/create-admin.ts (service role) only. If an env allow-list is kept, use server-only ADMIN_EMAIL (never NEXT_PUBLIC_*) and only for bootstrapping, not as a permanent override.
3. Centralize role resolution in lib/supabase/auth.ts (e.g. getAuthContext()) and use it from middleware (or proxy), app/auth/callback, app/api/orders, and all requireApi* helpers. Middleware may query profiles with the service role or via a security-definer RPC `get_my_auth_context()`; it must fail closed if the profile is missing.
4. New migration (idempotent):
   - Replace handle_new_user: role is 'worker' only when signup_as='worker', else 'customer'; never 'staff'/'admin'; ignore staff_role_id from metadata; keep `on conflict (id) do nothing` and full_name coalesce from SETUP_FULL.
   - Drop user_update_own_profile if it exists; recreate as an UPDATE policy with USING and WITH CHECK (id = auth.uid()), AND add a BEFORE UPDATE trigger on profiles that raises if role, staff_role_id or staff_status change unless current_setting('request.jwt.claim.role', true) = 'service_role' (or my_role()='admin'). Alternatively REVOKE UPDATE ON profiles FROM authenticated and GRANT UPDATE (full_name, phone, default_address, avatar_url, onboarding_completed) — verify column names against the live schema.
   - Ensure a self SELECT policy exists (id = auth.uid()).
   - Do NOT include data changes automatically; instead add a commented, reviewed data-fix block listing: demote the seeded hard-coded admin account to customer if not intended; list all profiles with role in ('admin','staff') for manual review.
5. Staff invite: store invites server-side (new table staff_invites(email, role_id, invited_by, token_hash, expires_at, accepted_at) OR rely on profiles.role='staff' AND staff_status='invited' written by the service role in lib/data/team.ts invite flow). acceptStaffInvite must verify that state for the calling user, then set profiles.staff_status='active' (and full_name) with the service role; return 403 otherwise.
6. /api/orders GET: replace the hand-rolled check with getUserPermissions().permissions.includes("orders.view") (verify the permission name in lib/auth/permissions.ts) and staff_status==='active'.
7. Remove SETUP_FULL's admin seed block (or the whole file per FP-07).
8. Fix docs/BUILD_STATUS.md admin email statement.

TESTS
- Customer calls supabase.auth.updateUser({data:{role:'staff',staff_status:'active'}}) → middleware still denies /admin, APIs 403.
- signUp with data {signup_as:'staff', staff_role_id:<uuid>} → profile role 'customer'.
- Customer PATCH profiles {role:'admin'} via anon REST → rejected (SQL test against local Supabase: `supabase start` + psql, or pgTAP).
- Accept-invite by a non-invited user → 403; by an invited user → profiles.staff_status='active' and permissions granted.
- Profile missing → fail closed (403/redirect), not admin.
- Admin (profiles.role='admin') retains full access; legit staff with role permissions get exactly those permissions.

SECURITY: trusted identity = Supabase session via auth.getUser(); trusted role = profiles row. Unauthorized: 401 (no session) / 403 (insufficient). Existing sessions keep working (no forced logout needed), but stale metadata no longer matters.
MIGRATION RISK: legit staff currently relying on metadata-only status need a one-time reviewed backfill of profiles.staff_status/staff_role_id from auth metadata — generate the SELECT to review first, apply only after human approval.
```

### FP-05 — Email verification and enumeration (AUTH-003, AUTH-006) · P1

```text
TASK: FP-05 Email confirmation takeover & enumeration — AUTH-003, AUTH-006. Apply the Common Constraints.

CONTEXT
- app/api/auth/verify-email/route.ts:4-46 — unauthenticated; finds a user by email via listUsers() and sets email_confirm:true; reveals existence (404/200) and role.
- app/api/auth/register/route.ts:56-60 — creates users with email_confirm:true (comment: avoids SMTP rate limits).
- app/api/auth/check-email + lib/auth/email-check.ts:18-47 — returns existingRole for any email; returns available:true on error; listUsers() unpaginated (first 50 users only).
- Other unpaginated listUsers(): app/api/admin/customers/route.ts:86, app/api/orders/route.ts:80, lib/data/team.ts:48.
- Callers: app/(auth)/verify-email/page.tsx, app/mitra/(auth)/verify-email, register pages.

DESIRED BEHAVIOUR
1. Remove /api/auth/verify-email, or restrict it so it can only confirm the CURRENT session user after Supabase OTP verification (supabase.auth.verifyOtp). It must never take an arbitrary email.
2. Registration must not set email_confirm:true. Use supabase.auth.signUp (or admin.generateLink type 'signup') so Supabase sends a confirmation email. If SMTP limits are the concern, document configuring custom SMTP rather than skipping verification. Confirm with docs/spec/SPEC_CUSTOMER.md / SPEC_MITRA.md that email verification is required (it is referenced by /verify-email pages).
3. check-email: respond with a generic shape that does not disclose role; keep only what the UI strictly needs (e.g. "this email belongs to a different account type" may still be a product requirement — mark for product clarification and, if kept, add rate limiting). Fail CLOSED on errors (500, not available:true).
4. Replace all listUsers() scans with an exact lookup: add a profiles.email column synced by trigger, or a security-definer SQL function get_user_id_by_email(email) callable only by service_role; or paginate listUsers({page, perPage:1000}) until exhausted for admin listing pages.

TESTS
- POST verify-email with a foreign email → 404/401 and no change.
- Register → user unconfirmed until link clicked; login before confirmation fails with a clear message.
- check-email on error → 500; response contains no role names.
- Lookup works for the 51st+ user (seed 60 users in local Supabase).
```

### FP-06 — Mitra API authentication and ownership (PERM-002) · P0

```text
TASK: FP-06 Mitra API auth — PERM-002. Prerequisite: FP-04 (central auth context). Apply the Common Constraints. NOTE: the data layer for jobs is still mock (ARCH-001, fixed in FP-09); this task adds the security gate and correct identity resolution so FP-09 can build on it.

CONTEXT
- All /api/mitra/** routes default the identity: `const workerId = user?.id || "w-1"` — app/api/mitra/jobs/route.ts:17, jobs/[id]/route.ts:16, jobs/[id]/accept/route.ts:16, decline:19, status:28, photos:17, earnings/route.ts:15; profile and application routes use similar fallbacks ("usr-w-1"); application/submit too.
- lib/data/mitra.ts: acceptMitraJob (:445-492), updateMitraJobStatus (:527-622), addMitraJobPhoto (:627-662) — no ownership checks; saveMitraApplication (:180-200) upserts workers with service role.
- photos/route.ts:54-73 creates and uploads to a public "order-photos" bucket with the service role.
- orders.worker_id references workers.id (init_schema.sql ~:77), NOT auth.users.id.

DESIRED BEHAVIOUR
1. Add requireWorker(opts) in lib/supabase/auth.ts: getUser() → 401 if none; profiles.role must be 'worker' → 403; load workers row by user_id; for job routes require application_status='approved' (and is_active if the column exists) → 403. Return { user, worker }.
2. Application routes (GET/PUT application, submit) require an authenticated user with role 'worker' (status may be draft/rejected); they must never write application_status other than draft→pending (submit). Remove every "w-1"/"usr-w-1" fallback.
3. Job routes pass worker.id (not user.id). Accept: only orders with status 'paid' and (worker_id is null OR a pending job_offers row for this worker — coordinate with FP-09). Status/photos/decline/detail: only when orders.worker_id = worker.id (or a pending offer for decline/detail) → otherwise 404.
4. Photos: validate MIME by magic bytes (jpeg/png/webp), size cap (e.g. 5 MB), server-generated filename; bucket must be created by migration (FP-07), not at runtime; private bucket + signed URLs preferred.

TESTS: anonymous → 401 on every /api/mitra route; customer → 403; pending-application worker → 403 on jobs; worker X acting on worker Y's job → 404; approved assigned worker → 200; non-image upload → 400.
```

### FP-07 — Schema source of truth, RLS hardening, storage (DB-001, DB-002, DB-007, DB-008) · P1

```text
TASK: FP-07 Schema consolidation & RLS — DB-001, DB-002, DB-007, DB-008. Prerequisite: read-only dump of the live schema (supabase db dump --schema-only against the project, run by a human) committed to a scratch location for comparison. Apply the Common Constraints. You must NOT run anything against the remote project.

CONTEXT
- supabase/migrations/: 20261010000000_init_schema.sql, 20261011000000_avatars_storage.sql, 20261013000000_staff_and_permissions.sql, 20261013000001_mitra_and_dispatch.sql. supabase/SETUP_FULL_DATABASE.sql is an outdated snapshot (missing roles, site_content, faq_items, admin_audit, job_offers, app_settings, staff_* and dispatch columns; has extra self policies and an admin seed; duplicate id b0000000-…-0002 in seed).
- Bare `create policy` (non-idempotent): init_schema :236ff, avatars_storage :10-40, mitra_and_dispatch :87-115.
- Tables with RLS on and no policies: worker_packages, order_photos, order_events, complaints, subscriptions. No customer SELECT on orders/payments/subscriptions; no profile self-select in migrations.
- mitra_and_dispatch.sql:96-97 `worker_manage_own_profile … for all using (user_id = auth.uid())` (no WITH CHECK); :92 worker_update_job_offers unrestricted; workers.application_status default 'approved' (init); public_read_workers exposes phone/email.
- Buckets created at runtime: order-photos (app/api/mitra/jobs/[id]/photos/route.ts), services (app/api/admin/services/upload/route.ts), site-content (content upload); avatars has no limits.

DESIRED BEHAVIOUR
1. Declare migrations the single source of truth. Write a new baseline-reconciliation migration that brings a DB created from EITHER SETUP_FULL or the migrations to the same final state using only idempotent DDL (create table if not exists, alter table add column if not exists, drop policy if exists + create policy, create or replace function). Then replace SETUP_FULL_DATABASE.sql with a short README pointing to migrations (or regenerate it from migrations) and fix the seed duplicate id. Remove the hard-coded admin seed.
2. RLS (new migration):
   - profiles: self select; self update guarded per FP-04 (coordinate — do not duplicate).
   - orders/payments/subscriptions/order_events/order_photos/complaints: customer SELECT own (customer_id = auth.uid(), via join for child tables); worker SELECT assigned (worker_id = my_worker_id()); admin all; active staff via has_permission().
   - worker_packages: public select for approved workers; owner insert/delete only for own worker row.
   - workers: split owner policy into select/insert/update with WITH CHECK; BEFORE UPDATE trigger preventing owner changes to application_status (except draft/rejected→pending), is_verified, is_active, reviewed_by, reviewed_at, rejection_reason; change default application_status to 'draft' (existing rows untouched).
   - public worker profile: create view public.workers_public (safe columns only — verify which the UI uses in app/workers/[slug] and components/customer/WorkerCard.tsx) and drop phone/email from anonymous access.
   - job_offers: worker update only pending→accepted|declined (trigger or WITH CHECK on status).
   - Add `alter publication supabase_realtime add table public.orders` only if FP-13 keeps realtime (coordinate).
3. Storage: create buckets order-photos (private), services and site-content (public read, admin write), avatars (limits). Set file_size_limit and allowed_mime_types. Policies: path prefix = auth.uid() for avatars; order-photos write only by assigned worker/customer of that order.
4. Constraints/indexes (check existing data first; write a pre-check SELECT for duplicates and abort with a clear message if any exist):
   - unique index on payments(kind, ref_id) where status in ('pending','success');
   - unique index on complaints(order_id) where status='open';
   - indexes on payments(customer_id, kind, created_at), payments(ref_id), order_photos(order_id), complaints(order_id), worker_packages(package_id), orders(package_id), orders(worker_id), profiles(role);
   - updated_at trigger on orders.
   Do not add FKs with ON DELETE CASCADE to financial tables.

VALIDATION: `supabase start` locally; apply migrations from scratch AND on top of SETUP_FULL; both must succeed and `supabase db diff` between them must be empty. Write SQL tests (pgTAP or psql scripts) for each RLS rule: customer A cannot select B's order; worker cannot self-approve; anon cannot read worker phone.
ROLLBACK: each migration header contains the inverse statements. No data is deleted.
```

### FP-08 — Transactional order core (DB-003, DB-004, DB-006, ARCH-002, API-001, API-004) · P1

```text
TASK: FP-08 Make the database authoritative for order creation and transitions. Prerequisites: FP-01, FP-07. Apply the Common Constraints.

CONTEXT
- lib/data/orders.ts:
  - :5 inMemoryOrders = [...MOCK_ORDERS]; getOrderById prefers memory (:296-297) and caches DB rows (:337); getOrders merges mocks (:185-186).
  - transitionOrder (:357-456) validates against memory, updates DB without status guard, ignores errors, skips DB when typeof window !== 'undefined' (:421).
  - createCustomerOrder (:780-984): Midtrans Snap created first; orders insert (:922), order_photos (:942), order_events (:953), payments (:964) separate and unchecked; customer fallback to first customer/hard-coded UUID (:866-873); package fallback (:695, :883-904).
  - order_code 4 random digits (:703-704).
- app/api/orders/route.ts: POST (:213-260) ignores idempotency_key; GET merges MOCK_ORDERS (:112-121), loads all orders unpaginated (:51-81).
- lib/data/services.ts: getPackageById returns inactive; price fallback `|| 100000` (:166); mock packages merged (:184-188).
- lib/orders/transitions.ts: TRANSITIONS matrix + canTransition.

DESIRED BEHAVIOUR
1. Create Postgres functions (new migration, security definer, `set search_path = public`, EXECUTE granted to service_role only):
   - create_order(p_customer_id, p_package_id, p_address, p_scheduled_date, p_notes, p_photo_paths text[], p_idempotency_key text, p_service_fee int) → inserts orders (+ photos, + 'created' event, + pending payment row) in one transaction; price comes from service_packages where is_active; raises if customer profile or package missing/inactive; returns the existing order when (customer_id, idempotency_key) already exists (add nullable column + unique partial index).
   - transition_order(p_order_id, p_from, p_to, p_actor, p_actor_id, p_note) → `update orders set status=p_to … where id=p_order_id and status=p_from returning *`; raise 'conflict' when 0 rows; insert one order_event; enforce the same matrix as lib/orders/transitions.ts (keep TS as the documented copy, or generate one from the other).
2. createCustomerOrder: validate input (zod), call create_order first, THEN create the Snap transaction using the DB total; store snap_token + redirect_url on the payment row; if Snap fails, mark the order cancelled/payment failed and return an error.
3. transitionOrder: server-only (add `import "server-only"`), always read from DB, call transition_order RPC, map 'conflict' to HTTP 409. Delete inMemoryOrders usage for real orders; mock data only behind USE_MOCK_DATA=true in development (process.env.NODE_ENV !== 'production').
4. Remove all customer/package fallbacks; return 400/404 instead.
5. Order code: secure generator (see FP-03) with retry on 23505.
6. Public catalog: getPackages/getCategories/getPackageById for public callers filter is_active=true; remove `|| 100000`; reject price ≤ 0 on admin save.
7. GET /api/orders: server-side filtering + pagination (limit/offset or cursor, default 20) for admin; customers see only their own orders.

TESTS (local Supabase)
- Order insert failure → no payment row, no Snap call, API 4xx/5xx.
- Same idempotency_key twice → one order.
- Two concurrent transitions pending_payment→paid and pending_payment→cancelled → exactly one succeeds, the other 409.
- Unknown/inactive package → 404; missing profile → 400 (no fallback customer).
- No MOCK_* object appears in any API response in production mode.
DATA: existing orders unaffected; idempotency_key nullable.
```

### FP-09 — Dispatch, mitra job lifecycle and payouts on the DB (ARCH-001 mitra, BIZ-001, BIZ-002, FE-004) · P1

```text
TASK: FP-09 Persist the mitra/dispatch lifecycle and payouts. Prerequisites: FP-06, FP-07, FP-08. Apply the Common Constraints. Clarify business rules in docs/spec/SPEC_MITRA.md and SPEC_ADMIN.md before coding (commission %, offer timeout OFFER_RESPONSE_MINUTES, auto-complete AUTO_COMPLETE_MINUTES, payout timing). Where the spec is silent, stop and list the question instead of guessing.

CONTEXT
- lib/data/mitra.ts operates on MOCK_ORDERS: jobs list (:380), detail (:430), acceptMitraJob (:445-492), decline (:502), updateMitraJobStatus (:527-622, reimplements transitions, omits from_status), addMitraJobPhoto (:627-662, no order_photos row), getMitraEarnings constants (:680-738), dashboard stats with fake fallbacks (:333-344), UTC month bucketing (:320-323, :414-415).
- lib/data/orders.ts dispatch helpers: manualAssignWorker, replaceWorker, retryDispatch (fake candidate :621-630), releaseWorkerAndRedispatch (sets worker_confirmed→paid, not in TRANSITIONS, :661), resolveComplaint('cancel_refund') attempts an invalid transition after closing the complaint (:532-545).
- lib/data/payouts.ts / transactions.ts are mocks; markPayoutAsPaid uses paid_by:'adm-1'.
- DB: job_offers (unique(order,worker), partial unique pending — mitra_and_dispatch.sql:21-22), payouts(order_id unique), complaints, orders.preferred_worker_id/dispatch_status/dispatch_attempts/allow_reassign. orders.ts:925 currently writes the chosen worker into worker_id instead of preferred_worker_id.
- app/mitra/daftar/page.tsx:9,37,228,404,595 uses MOCK_CATEGORIES/MOCK_PACKAGES and default ["pkg-1"].

DESIRED BEHAVIOUR
1. SQL functions (security definer, service_role only): offer_job(order_id, worker_id), accept_offer(offer_id, worker_id) (atomic: offer pending→accepted AND orders paid→worker_confirmed with worker_id set where worker_id is null; 409 otherwise), decline_offer, release_worker, complete_order_with_payout(order_id, actor) (transition →completed + insert payouts row amount = round(package_price*(1-commission)) using unique(order_id)), file_complaint, resolve_complaint (valid transitions only; 'cancel_refund' must go through a transition that the matrix allows — update TRANSITIONS if the spec requires awaiting_confirmation→cancelled, and record refund_required for manual Midtrans refund).
2. Rewrite lib/data/mitra.ts and the dispatch helpers to call these functions; delete MOCK_ORDERS usage in production paths. Customer's chosen worker → preferred_worker_id.
3. Earnings/payouts read from payouts table; month buckets in Asia/Jakarta; exclude cancelled/refunded; no fake numbers when zero.
4. Mitra registration loads categories/packages from /api/services (real UUIDs).
5. Single transition authority: mitra/admin/customer all go through transition_order / these RPCs.

TESTS: two workers accepting simultaneously → one wins; completion creates exactly one payout; payout amount correct with rounding; complaint open blocks completion (from DB); WIB month boundary test (2026-10-31T23:30+07:00 counted in October); full E2E order paid→completed persists across a fresh server process.
```

### FP-10 — Admin actions server-side; remove mock data from production (ARCH-001 admin, ADMIN-002, DB-005, PERM-003) · P1

```text
TASK: FP-10 Admin data paths. Prerequisites: FP-04, FP-08 (and FP-09 for dispatch actions). Apply the Common Constraints.

CONTEXT
- app/admin/orders/[id]/page.tsx ("use client") imports and calls transitionOrder, manualAssignWorker, resolveComplaint, replaceWorker, retryDispatch, releaseWorkerAndRedispatch, addOrderPhoto directly (:16-22, :160 notes mutate a local object, :170, :215, :277, :330, :349, :373) — runs in the browser, never persisted. app/admin/orders/page.tsx:61 and components/admin/CommandPalette.tsx:43-44 seed state from MOCK_ORDERS/MOCK_WORKERS; AdminShell.tsx:649 links /admin/orders/ord-5.
- lib/data/dashboard.ts:8 always returns getMockDashboardStats.
- app/api/admin/customers/route.ts:233-237 returns MOCK_CUSTOMERS when empty.
- lib/data/services.ts:93-97 merges mock categories; savePackage (:383 category fallback, :393 price fallback, :423-434 omits image_url/badge/worker_count) and category upsert (:336) ignore errors; delete* always true.
- lib/data/roles.ts:97 and lib/data/content.ts:130 generate non-UUID ids for uuid columns.
- app/api/admin/faq/route.ts:11-14 GET unauthenticated; getFaqItems(true) overwrites shared cache (lib/data/content.ts:98-107).
- Module-level caches: inMemoryContent/Faq/Packages/Categories/Staff/Roles/AuditLogs.

DESIRED BEHAVIOUR
1. Create admin API routes (e.g. app/api/admin/orders/[id]/{transition,assign,replace,release,retry-dispatch,notes,complaints/[cid]/resolve,photos}/route.ts) guarded by requireApiPermission with the matching permission from lib/auth/permissions.ts; each calls the FP-08/FP-09 SQL functions and logs admin_audit. The page calls these routes and re-fetches; it never imports lib/data/orders mutators (add `import "server-only"` to lib/data/* modules that use the service role so this is enforced at build time).
2. Dashboard: compute real stats via SQL aggregates (WIB day boundaries); keep the existing response shape used by app/admin/page.tsx and DashboardExportModal.
3. Remove mock merges/fallbacks from customers, services, categories, orders, command palette; mock only when USE_MOCK_DATA=true and NODE_ENV!=='production'.
4. Services: persist image_url/badge (add columns via migration if absent — check live schema), validate price>0, reject unknown category (400), check every error, real delete results (409 on FK violation).
5. IDs: use crypto.randomUUID() (or DB default) for roles and FAQs.
6. FAQ GET requires content.manage; public FAQ stays on /api/content. Do not mutate shared caches with filtered results — prefer removing module-level caches for mutable admin data entirely.

TESTS: admin transition persists and is visible from another request/process; user without orders.manage → 403; dashboard numbers match seeded fixture; creating a role/FAQ persists (uuid); service save with price 0 → 400; production build contains no MOCK_* usage in admin routes (grep test).
```

### FP-11 — Customer deletion, validation and audit (ADMIN-001, ADMIN-004, ADMIN-005, ADMIN-007) · P1

```text
TASK: FP-11 Admin safety. Apply the Common Constraints. Product clarification needed: legal retention period for payments/orders (UU PDP) — default to retaining financial records and anonymizing PII.

CONTEXT
- app/api/admin/customers/route.ts:374-412 DELETE: deletes subscriptions → payments → orders (cascades payouts/complaints/photos/events) → workers → profiles → auth user, ignoring errors, always success, no role check on the target (only a hard-coded super-admin email guard :359), no audit. PATCH grant_plus/revoke_plus (:273-311) unvalidated `days`, no audit.
- zod is a dependency but never imported. CMS announcement.link rendered as href in components/customer/CustomerShell.tsx:230.
- Audit: lib/data/audit.ts logAdminAudit swallows errors + in-memory fallback; content updates logged twice (lib/data/content.ts:78-85 and app/api/admin/content/route.ts:60-67); services, FAQ reorder, uploads, customer actions unlogged.
- Routes return raw err.message; cancel-email-change returns full user object.

DESIRED BEHAVIOUR
1. Replace hard delete with anonymize_customer(user_id) SQL function (single transaction): verify profiles.role='customer'; refuse if orders are in non-terminal statuses (409); scrub PII in profiles and orders (name/phone/address → placeholders), keep payments/orders/payouts; mark profile deleted_at (add nullable column); then auth.admin.deleteUser (or ban) — if that fails, return 500 and leave a retryable state. Audit entry with actor and target.
2. Add zod schemas for every admin route body (customers PATCH days int 1..366, content values per key from lib/data/content-types.ts, roles permissions ⊆ ALL_PERMISSIONS, FAQ reorder = array of existing uuids). 400 with field errors.
3. Announcement link: allow only relative paths or https: URLs on an allow-list; render with rel="noopener noreferrer" when external.
4. Audit: one logAdminAudit call per action at the route layer; remove the duplicate in lib/data/content.ts; DB insert errors are logged and surfaced (no in-memory store).
5. Error responses: generic message + request id; log details server-side. cancel-email-change returns only { success, email }.

TESTS: delete of a worker/staff id → 400; delete with active order → 409; after anonymize, payments rows still exist and PII is scrubbed; invalid days → 400; javascript: link rejected; each admin mutation writes exactly one admin_audit row.
```

### FP-12 — Redirects, security headers, uploads, filter injection (AUTH-005, CONFIG-001, ADMIN-003, API-003) · P2

```text
TASK: FP-12 Web hardening. Apply the Common Constraints. Read node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md and the proxy docs first.

CONTEXT
- Server next validation: app/auth/callback/route.ts:18 (startsWith("/") && !startsWith("//") — "/\evil.com" passes), middleware.ts:355-368; callback origin from x-forwarded-host (:13).
- Client: app/admin/login/page.tsx:55,169 window.location.replace(next); app/(auth)/verify-email/page.tsx:94 window.location.href = next (javascript: possible); app/(auth)/login/page.tsx:83-93 and app/(customer)/welcome/page.tsx:13,97 router.push(next).
- next.config.ts has no headers().
- Uploads: app/api/admin/content/upload/route.ts:20-37, app/api/admin/services/upload/route.ts:21-41 (client MIME, raw extension, runtime createBucket, base64 data-URI fallback, GIF allowed).
- PostgREST .or() interpolation: lib/data/workers.ts:31 (search), webhook (fixed in FP-01).

DESIRED BEHAVIOUR
1. lib/safe-redirect.ts safeNext(input, fallback): accept only paths starting with a single "/" whose second char is not "/" or "\", no control chars, and new URL(p, SITE_URL).origin === SITE_URL origin. Use it in every location above (server and client). Use NEXT_PUBLIC_SITE_URL instead of x-forwarded-host.
2. Security headers in next.config.ts headers() (or proxy): CSP (nonce-based per the Next guide; allow Midtrans snap domains app.midtrans.com/app.sandbox.midtrans.com, Supabase URL, Google fonts if used), frame-ancestors 'none', Strict-Transport-Security, Referrer-Policy strict-origin-when-cross-origin, X-Content-Type-Options nosniff, Permissions-Policy (camera/mic/geolocation as needed). Verify the Snap popup still works.
3. CSRF: for cookie-authenticated mutating API routes, reject requests whose Origin header is present and not the site origin (shared helper).
4. Uploads: sniff magic bytes (jpeg/png/webp only, per SPEC_ADMIN:1521), max size, extension derived from detected type, server-generated name, no runtime bucket creation, no data-URI fallback (return 500).
5. workers search: escape/strip `,()*%\` from the query or use separate .ilike calls combined server-side.

TESTS: safeNext table test (/\evil.com, //evil.com, javascript:alert(1), https://evil.com, /orders?x=1 ✓); headers present on / and /admin; upload of a PNG-renamed .html → 400; search "a,id.eq.x" returns normal results without filter alteration.
```

### FP-13 — Frontend payment and date fixes (FE-001, FE-002, FE-003, FE-005) · P2

```text
TASK: FP-13 Customer payment UX correctness. Prerequisite: FP-08 (snap token stored on payments). Apply the Common Constraints.

CONTEXT
- Snap script hard-coded to sandbox: app/payment/[orderId]/page.tsx:228, app/order/[packageId]/page.tsx:813, app/plus/page.tsx:356; server switches on MIDTRANS_IS_PRODUCTION (lib/midtrans.ts:41-44).
- Date: app/order/[packageId]/page.tsx:69-75 label uses local date, value uses toISOString().split("T")[0] (UTC); server (app/api/orders/route.ts:225) doesn't validate scheduled_date.
- app/payment/[orderId]/page.tsx: realtime channel on orders (:155-170) can't deliver (no customer RLS/publication; filter id=eq.<param> may be a code); polling stops after 60s (:173-190); fake fixed countdown (:43); resume payment needs snap token not in DB (:198-201); broken link href="/services" (:260).
- app/orders/[id]/page.tsx:71-75 polls every 4s forever.
- No error.tsx/not-found.tsx/loading.tsx anywhere in app/.

DESIRED BEHAVIOUR
1. Expose NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION (or derive the snap URL server-side and pass it as a prop) and load the matching Snap URL in all three pages via one shared helper/component.
2. Dates: build values with Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}) for YYYY-MM-DD; server validates format and that the date is ≥ tomorrow (WIB) and ≤ the allowed booking window (check SPEC_CUSTOMER).
3. Payment page: poll GET /api/orders/[id] with backoff (e.g. 3s → 30s cap) until a terminal status or the payment expiry; derive the countdown from payment created_at/expiry returned by the API; resume payment uses payments.snap_token from the API; either drop realtime or enable it properly with FP-07's RLS + publication and subscribe by order UUID.
4. Orders detail polling: stop at terminal statuses, back off, show error state.
5. Fix /services link (point to /search or create the page — check navigation intent); add app/error.tsx, app/not-found.tsx, and admin/mitra-level error boundaries.

TESTS: unit test for WIB date helper at 00:30 and 23:30 WIB; component test that production flag selects app.midtrans.com; manual: pay via VA after 2 minutes → page updates without refresh.
```

### FP-14 — Test harness and CI (TEST-001, FE-006) · P2 (start early, in parallel)

```text
TASK: FP-14 Test infrastructure. Independent of other prompts; do this first if possible so other fixes can add tests. Apply the Common Constraints.

CONTEXT
- package.json has no test script; no test framework; no .github/ or other CI.
- scripts/test-phase4.ts and scripts/test-accept-invite.ts import lib/data/* which use createAdminClient() (service role) — running them with .env.local writes to the real project. scripts/test-accept-invite.ts:60 contains a hard-coded password literal; scripts/create-admin.ts prints a recovery action_link.
- `npx tsc --noEmit` passes; `npx eslint .` reports 421 problems (238 errors) incl. React Compiler errors (setState in effect ~25x, refs during render components/customer/BeforeAfterSlider.tsx:87-88, use-before-declare components/mitra/SlideToConfirm.tsx:50).

DESIRED BEHAVIOUR
1. Add vitest (unit/integration) and configure path alias "@/". Add `test` and `typecheck` scripts.
2. Integration tests run against a LOCAL Supabase (supabase CLI `supabase start`, migrations applied) using env from a committed .env.test with local-only keys; guard: abort if SUPABASE URL is not localhost/127.0.0.1.
3. Move scripts/test-*.ts under the same guard (refuse non-local URLs); remove hard-coded password (read from env); stop printing recovery links (write to a file with a warning or require --print flag).
4. CI (GitHub Actions): install, tsc, eslint (initially allow the existing count via a baseline or fix errors; do not disable rules globally), vitest unit; optional job with supabase start for integration.
5. Fix the real-bug lint items: SlideToConfirm use-before-declare/stale closure, BeforeAfterSlider ref reads during render, prefer-const. Do NOT mass-fix `any` in this task.

ACCEPTANCE: `npm test` runs green locally; CI workflow file present; scripts cannot touch a non-local project.
```

---

## Section 10 — Regression Test Plan

| Area | Test | Type | Guards against |
|---|---|---|---|
| Payments | Unsigned, wrong-sig, wrong-amount, replayed, out-of-order webhook matrix | Integration | PAY-001, PAY-002, PAY-004 |
| Plus | Single payment → one extension; renewal stacking; no re-grant on GET; POST 405 | Integration | PAY-003 |
| Orders authz | Anon / other customer / owner / admin / assigned worker × GET, cancel, confirm, complaint | API | PERM-001 |
| Role source | Metadata tampering; signup `signup_as=staff`; profile `role` self-update via REST; accept-invite without invite; missing profile fails closed | API + SQL | AUTH-001, AUTH-002, AUTH-004 |
| RLS | pgTAP per table: customer isolation, worker self-approve blocked, anon worker PII hidden, offer status restriction | SQL | DB-002 |
| Migrations | Fresh apply + apply-on-SETUP_FULL → identical schema (`db diff` empty); rerun is idempotent | CI job | DB-001 |
| Order core | Atomic create (failure leaves no orphans); idempotency; concurrent transitions → one 409; inactive package rejected | Integration | DB-003, DB-004, ARCH-002, API-001, API-004 |
| Mitra lifecycle | Double-accept race; status chain to `awaiting_confirmation`; photos persisted; completion → exactly one payout | Integration / E2E | ARCH-001, BIZ-001, BIZ-002 |
| Admin | Admin actions persist across processes; permission-denied paths; dashboard aggregates vs fixture; customer anonymize keeps ledger | API | ADMIN-001, ADMIN-002, ARCH-001 |
| Auth flows | Email confirm required; verify-email cannot target others; `safeNext` table; enumeration response generic | API + unit | AUTH-003, AUTH-005, AUTH-006 |
| Frontend | WIB date helper; Snap URL selection; payment polling stops at terminal state | Unit / component | FE-001, FE-002, FE-003 |
| Smoke E2E (Playwright, local) | Register → order → sandbox pay → admin dispatch → mitra accept/progress → customer confirm → payout visible | E2E | Cross-module |

---

## Section 11 — Remaining Unknowns

1. **Which schema is deployed** (SETUP_FULL, the migrations, or a mix). This decides whether AUTH-001 (self-promote to admin) is live right now. Run the read-only SQL in Section 7 first.
2. **Live data state:**
   - number of `admin`/`staff` profiles;
   - whether the hard-coded email account currently holds DB `role='admin'`;
   - orphan `payments` rows (no matching order);
   - duplicate `order_code`s;
   - subscriptions extended by duplicate notifications.

   None of this could be checked without DB access.
3. **Production environment variables** (names only): `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SERVER_KEY` (set and non-dummy?), `USE_MOCK_DATA`, `ADMIN_EMAIL` vs `NEXT_PUBLIC_ADMIN_EMAIL`, `PLUS_DURATION_DAYS`, `SERVICE_FEE`.
4. **Business rules needing product decisions:**
   - mitra commission rate and payout timing;
   - refund policy (cancel after paid, complaint "cancel_refund");
   - whether staff with `orders.view` should see customer emails;
   - booking window for `scheduled_date`;
   - whether the check-email "wrong account type" message is a requirement;
   - data-retention rules for deleted customers.
5. **Runtime behaviour not executed:**
   - `next build` and `next dev` were not run;
   - Midtrans sandbox flows were not exercised;
   - Supabase Realtime publication status is unknown;
   - Vercel instance and cold-start behaviour is inferred from code, not observed.
6. **Storage:** the actual bucket configuration (public/private, size limits) is unknown.
7. Exact staff permission identifiers in `lib/auth/permissions.ts` are referenced generically in the fix prompts. Agents must read that file before wiring checks.
