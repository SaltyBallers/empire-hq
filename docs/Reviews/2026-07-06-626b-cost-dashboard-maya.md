# Code Review: #626b — Empire-HQ Cost Dashboard

**Reviewer:** Maya (reviewer agent)
**Date:** 2026-07-06
**Branch:** `feature/626-cost-dashboard` (commit `90a98f8`)
**PRD:** `docs/PRD/PRD-626b-empire-hq-cost-dashboard.md`

---

## Verdict: 🟢 APPROVED

No blockers. Clean, well-structured implementation. Auth gates are correct and defense-in-depth. Sync functions degrade gracefully. VoiceCostView is properly null-safe. One pre-existing advisory noted below.

---

## Files Reviewed

| File | Status | Verdict |
|------|--------|---------|
| `src/types/costs.ts` | Modified | Clean |
| `src/lib/costs/sync.ts` | Modified | Clean |
| `src/components/costs/VoiceCostView.tsx` | New | Clean |
| `src/components/costs/CostsDashboard.tsx` | Modified | Clean |
| `src/middleware.ts` | Modified | Clean |
| `src/app/api/costs/trigger-sync/route.ts` | Modified | Clean |
| `src/app/api/costs/sync/__tests__/route.test.ts` | Modified | Clean |
| `vitest.config.ts` | New | Clean |
| `package.json` | Modified | Clean |

---

## Review Focus Areas

### 1. Auth/Allowlist Correctness — PASS

**Middleware (`src/middleware.ts:32`):** Hardcoded allowlist `['billd@getleveredup.com', 'erics@getleveredup.com']`. No domain-wide `@getleveredup.com` pattern. `surfballers@gmail.com` fully removed (grep confirms zero references in `src/`). Non-allowlisted users are signed out and redirected to `/login?error=unauthorized`.

**Trigger-sync (`src/app/api/costs/trigger-sync/route.ts:37`):** Reads `ADMIN_EMAILS` (comma-separated) with fallback to legacy `ADMIN_EMAIL`. This is env-driven rather than hardcoded, creating a configuration dependency rather than a code bug. Three layers of auth apply: (1) middleware checks session + ALLOWED_EMAILS, (2) route checks Supabase session via cookies, (3) route checks ADMIN_EMAILS env. If `ADMIN_EMAILS` is unset, the gate fails closed (empty array, nobody passes).

**Deploy config item:** Set `ADMIN_EMAILS=billd@getleveredup.com,erics@getleveredup.com` in Vercel env vars. If the legacy `ADMIN_EMAIL` is still set to `surfballers@gmail.com`, it's harmless (middleware blocks surfballers@ at the page level before the trigger-sync route is reached), but should be cleaned up for defense-in-depth parity.

**Cron sync route (`/api/costs/sync`):** Excluded from middleware (line 12, for cron access). POST uses `CRON_SECRET` auth — correct.

### 2. Sync Robustness — PASS

Every provider sync checks its required env var(s) first and returns `{ status: 'skipped' }` when missing. API errors throw, which `syncAllProviders` catches per-provider via `Promise.all` + individual try/catch wrappers (`sync.ts:381-393`), returning `{ status: 'error' }`. A failing provider never crashes sibling syncs.

Verified graceful degradation for all 5 missing keys:
- `OPENAI_ADMIN_API_KEY` → skipped (line 258)
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` → skipped (line 293-298)
- `FLY_MONTHLY_COST` / `SUPABASE_MONTHLY_COST` / `AXIOM_MONTHLY_COST` → ok with $0 placeholder + flag (lines 332-361)

### 3. Cost Data Correctness — PASS

**OpenAI:** Sums `amount.value` across all buckets and results (`sync.ts:276-280`). Query uses `bucket_width=1d` without `group_by`, so the API returns one total result per bucket (no line-item breakdown). `limit=50` covers a full month (max 31 days). `has_more` is tracked in metadata for observability. No double-count risk in production.

**Twilio:** Uses `totalprice` category for the authoritative monthly total (`sync.ts:312-313`), with fallback to summing all `price` fields if absent. `totalprice` is always present in ThisMonth records per Twilio docs; the fallback is a safety net. Correct.

**Type-A recurring (Fly/Supabase/Axiom):** Config-driven via env var, $0 placeholder with clear flag when unset, `confirmed: false` in metadata. No silent guessing. Matches PRD requirement.

### 4. VoiceCostView Null Safety — PASS

- View-absent/error: caught and treated as empty (`VoiceCostView.tsx:23-28`), with `console.warn` for diagnostics.
- Empty state: clean "no data yet" message with context about #626 merge dependency (line 73-79).
- All numeric fields null-coalesced: `row.call_count ?? 0`, `row.total_minutes ?? 0`, `row.total_estimated_cost_usd ?? 0` (lines 36-42, 130-136).
- Division guard: `total_minutes > 0` check before computing blended $/min (line 45).
- `blended_cost_per_min` renders `—` when null (line 139).
- Query bounded with `.limit(500)` per PostgREST 1000-row rule.

### 5. No PII — PASS

VoiceCostView displays only `ghl_location_id` — no customer names, phones, emails, or contact fields. Sync functions write only cost/balance data with sanitized metadata. Clean.

### 6. Build & Tests — PASS

- `npm test`: **25/25 tests pass** (vitest v4.0.18, 308ms).
- `next build`: **Clean compilation**, all 13 routes generated. TypeScript passes. No Suspense issues (neither component uses `useSearchParams`).
- Next.js 16 emits a deprecation warning for `middleware` → `proxy` convention. Not a blocker; address when convenient.

### 7. Additive-Only — PASS

- No database migrations in this PR.
- No writes to getleveredup tables. VoiceCostView reads from `voice_cost_monthly_by_account` (626a's view) via anon key — read-only.
- All sync writes target `admin_api_costs` with `app: 'empire'`. Upsert with `onConflict: 'app,provider,date,metric'` — idempotent.
- Existing project-spend dashboard and `empire-hq.vercel.app` deploy are untouched.

---

## Advisory (Non-Blocking)

### A1. Dashboard aggregation model vs. daily sync (pre-existing)

`CostsDashboard.tsx:122` sums ALL `admin_api_costs` rows for the current month per provider. If sync runs daily, each day creates a new row. For Type-B providers (Anthropic, OpenAI, Twilio), each daily row contains the running monthly total — summing them over-counts. For Type-A providers (Fly, Supabase, Axiom), every daily row is the same flat amount — over-counting is even more visible (e.g., 30 days x $30 = $900 displayed for a $30/mo subscription).

**This is a pre-existing design issue** affecting the original 3 providers equally. Duke's new providers follow the same pattern. Not a regression, and the Type-A env vars aren't set yet (placeholders at $0), so no immediate impact.

**Recommendation (future card):** Either (a) change the dashboard to use only the latest entry per provider per month for summary totals, or (b) change sync to write daily deltas rather than running totals. Option (a) is simpler and doesn't require changing the sync data model.

### A2. GET `/api/costs/sync` is unauthenticated (pre-existing)

The GET handler on `sync/route.ts:26-40` returns cost data without auth. The path is excluded from middleware (for cron POST access). This predates this PR and is not a regression. Cost data isn't PII but is sensitive business data.

**Recommendation:** Add `CRON_SECRET` check to the GET handler, or move it behind middleware.

### A3. OpenAI test mock fidelity

The `syncOpenAI` test (`route.test.ts:360-364`) includes both `line_item: null` and `line_item: 'gpt-4o'` results in the same bucket. Without `group_by` in the query, the real API returns only totals. The test data is unrealistic, though the production code and assertion are correct. Consider aligning the mock to match actual API behavior.

---

## Deploy Checklist (Bill/Zak execution items — not review blockers)

- [ ] Set `ADMIN_EMAILS=billd@getleveredup.com,erics@getleveredup.com` in Vercel env
- [ ] Remove legacy `ADMIN_EMAIL` env var if still set to `surfballers@gmail.com`
- [ ] Add `OPENAI_ADMIN_API_KEY` to Vercel env (from platform.openai.com/api-keys, Admin key)
- [ ] Add `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` to Vercel env
- [ ] Set `FLY_MONTHLY_COST`, `SUPABASE_MONTHLY_COST`, `AXIOM_MONTHLY_COST` once confirmed
- [ ] DNS: CNAME `hq.getleveredup.com` → `cname.vercel-dns.com` + Vercel domain add
- [ ] Post-DNS: verify login flow as billd@getleveredup.com, confirm surfballers@gmail.com is bounced
