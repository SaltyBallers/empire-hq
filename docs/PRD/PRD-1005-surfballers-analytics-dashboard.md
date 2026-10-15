---
trello_card_short: 1005
trello_list: "In Progress"
trello_labels: ["surfballers"]
project: empire-hq
title: "Surfballers analytics dashboard in Empire-HQ"
slug: surfballers-analytics-dashboard
branch_name: feature/1005-surfballers-analytics-dashboard
epic: 1000
created_at: 2026-10-15T00:00:00Z
updated_at: 2026-10-15T00:00:00Z
prd_status: done
card_budget:
  estimated_files: 9
  surface: frontend
  estimated_agent_minutes: 45
  is_atomic: true
  atomic_justification: >
    One cohesive read surface (the Surfballers analytics page) against ONE new
    cross-project data connection. The 5 views share a single new service-role
    client, a single aggregation route handler, and a single nav wiring. Splitting
    per-view would duplicate the client + route + nav scaffolding 5× and ship 4
    broken intermediate pages (a view with no data route). The data-plumbing (new
    Surfballers Supabase service-role client + /api/surfballers/analytics route) is
    the real work; the views are thin div-chart consumers of its JSON. Atomic.
dispatch_readiness:
  repo_path: "/Users/zak/Projects/empire-hq"
  base_branch: main
  target_agent: "logan"
  pattern_reference: "src/app/costs/page.tsx + src/components/costs/CostsDashboard.tsx + src/components/costs/MonthlyChart.tsx + src/components/costs/CostSummaryCards.tsx + src/lib/costs/sync.ts (getSupabase factory) + src/app/api/costs/sync/route.ts"
  do_not_touch:
    - "Do NOT read or touch admin_api_costs — that is the HQ vendor-cost board, a DIFFERENT grain. This dashboard reads the SURFBALLERS project's analytics tables ONLY."
    - "Do NOT expose the Surfballers project's service-role key to the browser. Reads go through a SERVER route handler; the browser never gets a Surfballers client or key."
    - "Do NOT add a charting library. Hand-built div/Tailwind charts only, mirroring MonthlyChart/CostSummaryCards."
    - "Do NOT break the existing /costs vendor dashboard, the apps dropdown, or the existing navItems routes — this is ADDITIVE."
    - "Do NOT display the ≤500-char truncated prompt snippet anywhere EXCEPT the Raw drill-down view, and never the full prompt (it isn't stored anyway). Never render user_id as anything but the opaque hash."
user_stories:
  - id: US-E1
    title: "Surfballers page + nav + cross-project read plumbing (atomic core)"
    files:
      new:
        - "src/app/surfballers/page.tsx"
        - "src/components/surfballers/SurfballersDashboard.tsx"
        - "src/app/api/surfballers/analytics/route.ts"
        - "src/lib/surfballers/client.ts"
        - "src/app/api/surfballers/analytics/__tests__/route.test.ts"
      edit:
        - "src/components/Navigation.tsx"
    verification:
      commands:
        - "npm run build"
        - "npm run lint"
        - "npm test"
      manual_steps:
        - "npm run dev; log in as allowlisted account; open /surfballers; confirm 5 view shells render with empty states, no console errors, no white-flash; /costs still works; non-allowlisted account bounced."
      expected_outputs:
        - "Next build green; Vitest green; /api/surfballers/analytics returns 200 well-formed JSON (empty-but-shaped if env vars unset); nav shows Surfballers enabled."
  - id: US-E2
    title: "The 5 views (thin div-chart consumers of the route JSON)"
    files:
      new:
        - "src/components/surfballers/UnitEconomicsView.tsx"
        - "src/components/surfballers/CallToolCostView.tsx"
        - "src/components/surfballers/ToolPopularityView.tsx"
        - "src/components/surfballers/IntentExplorerView.tsx"
        - "src/components/surfballers/RawEventsView.tsx"
      edit:
        - "src/components/surfballers/SurfballersDashboard.tsx"
    verification:
      commands:
        - "npm run build"
        - "npm test"
      manual_steps:
        - "In dev, exercise the range selector (7d/30d/90d/13mo) and confirm each view re-fetches and renders responsively on mobile width."
      expected_outputs:
        - "All 5 views render from the single route payload; range selector re-fetches; responsive layout intact."
observability:
  determined: true
  needed: false
  not_needed_justification: >
    Read-only internal dashboard (2 allowlisted viewers). No new user-facing
    runtime path, no writes, no money movement. Failures are visible in-page
    (empty/error state) and in Vercel function logs for the route handler. The
    data substrate it reads (assistant_events, rollups, intent) already carries its
    own observability from cards A/C/D. A dark-feature dataset/alert here would have
    zero consumers.
---

# PRD-1005 — Surfballers analytics dashboard in Empire-HQ (Epic #1000, Child E)

**Epic:** [#1000 — Cost & Usage tracking](https://trello.com/c/RrTwCvw1). **Depends on:** B (#1002 schema), C (#1003 cost rollups), D (#1004 intent classification). **Blocks:** nothing.

**This is the read surface for the whole epic.** Cards A–D produce the data in the **Surfballers** Supabase project (`qmczddecbywdinwxepjd`); this card builds the Empire-HQ page that reads and visualizes it. It is **physically and logically separate** from HQ's vendor-cost board (`/costs`, which reads `admin_api_costs` in HQ's OWN project). Do not conflate the two.

## Locked architecture decisions (orchestrator, 2026-10-15 — autopilot eng calls)

1. **Cross-project read = SERVER-SIDE service-role, not browser anon.**
   The Surfballers analytics tables have RLS enabled with **no read policies** (service-role bypasses RLS; anon reads return nothing). So:
   - New client factory `src/lib/surfballers/client.ts` → `getSurfballersSupabase()`, mirroring `getSupabase()` in `src/lib/costs/sync.ts` verbatim, but reading **new** env vars `SURFBALLERS_SUPABASE_URL` + `SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY` (these do NOT exist yet — see Deploy dependency).
   - New route handler `src/app/api/surfballers/analytics/route.ts` (GET) runs the service-role reads + aggregation server-side and returns **JSON aggregates only**. It is auth-gated automatically (NOT in `middleware.ts`'s skip list → requires an allowlisted session; keep it that way).
   - The page/component is `'use client'` and `fetch('/api/surfballers/analytics?range=...')` — mirroring how the browser never sees HQ's service-role key. Do NOT use the `@supabase/ssr` browser `createClient()` against the Surfballers project.

2. **Why not browser anon + RLS policies on Surfballers?** Adding anon-read RLS policies to `assistant_events` would expose per-user analytics (even hashed) to any authenticated Surfballers app user via the anon key — a data-exposure widening for zero benefit. HQ's 2 allowlisted viewers read via service-role behind HQ auth. Keep the Surfballers RLS locked.

3. **Nav wiring:** flip `src/components/Navigation.tsx` `apps` entry (currently `{ name: 'Surfballers', href: '#', icon: '🏈', disabled: true }`, ~line 11) to `{ name: 'Surfballers', href: '/surfballers', icon: '🏈', current: false }` AND add a `navItems` sidebar entry `{ name: 'Surfballers', href: '/surfballers', icon: <inline SVG, football/chart> }` so it appears in the left sidebar + mobile tabs like the other pages.

4. **Charts:** hand-built div bars + Tailwind, reusing the `MonthlyChart` stacked-bar idiom, the `CostSummaryCards` stat-card shell (`bg-card-bg border border-border rounded-lg p-6`, `text-2xl font-bold`), the meter-bar idiom, and the globals.css theme tokens (`text-foreground`, `text-muted-fg`, `bg-card-bg`, `border-border`, Sky-Blue `#00A8E8` accent). No new dependency.

## Data contract — what the route reads (Surfballers project `qmczddecbywdinwxepjd`)

The route aggregates from the tables cards A–D created. **Null/absent-safe**: any table/rollup missing or empty → that view renders a "no data yet" empty state, never errors (rollups/intent may lag until C/D cron runs land in prod; at epic scale = 2 users the data volume is tiny).

- `assistant_cost_rollup` (Card C) — grains `user | league | call | tool`, each row `{grain, key, window_start, window_end, token_cost, infra_cost, total_cost}` (`numeric(12,6)`). Primary source for **Unit Economics** (grain=user/league) and **Call & Tool Cost** (grain=call/tool). **Note from Maya's #1003 review:** the `tool` grain collapses to a single `"none"` key for llm_call-only data (tool_name is null on llm_call rows) — so **do NOT build a per-tool COST breakdown from the `tool` grain**; it's near-degenerate. Get **tool popularity** from raw `assistant_events` instead (next bullet).
- `assistant_events` (Card A) — `{event ('llm_call'|'tool_call'), correlation_id, user_id (opaque hash), league_id, model, input_tokens, output_tokens, total_tokens, tool_name, latency_ms, status, created_at, prompt_truncated, response_truncated}`. Source for **Tool Popularity** (COUNT by `tool_name` where `event='tool_call'`, over time), **Raw drill-down** (paginated event table), and per-call fallbacks.
- `intent_classification` (Card B table, Card D fills) — `{event_id, label (one of 8 taxonomy), confidence, model, classified_at}`, joined to `assistant_events` on `event_id`. Source for **Intent Explorer** (counts by label over time; drill a label → sample `prompt_truncated` from the joined events).
- (NOT consumed by E, exists for F:) `assistant_feedback`.

## User Stories

### US-E1 — Surfballers page + nav + cross-project read plumbing (atomic core)
- **AC — Route + page:** `src/app/surfballers/page.tsx` (`'use client'`, wrapped in `<AppLayout>` with an `<h1>Surfballers</h1>` + subhead, exactly like `costs/page.tsx`), rendering `src/components/surfballers/SurfballersDashboard.tsx`. Page is auth-gated by existing middleware (allowlisted emails only) — verify it is NOT added to the skip list.
- **AC — Server route:** `src/app/api/surfballers/analytics/route.ts` GET handler: uses `getSurfballersSupabase()` (service role), reads the contract tables, aggregates server-side, returns a single JSON payload shaped for the 5 views `{ unitEconomics, callToolCost, toolPopularity, intents, rawEvents, meta: { range, generatedAt, dataPresent: {...} } }`. Accepts `?range=` (default 30d; supports up to 13 months). Bounded queries — `.limit()`/`.range()` per the PostgREST 1000-row rule (paginate raw events). Returns 200 with empty sections (never 500) when tables are empty/absent.
- **AC — Client factory:** `src/lib/surfballers/client.ts` `getSurfballersSupabase()` mirroring `getSupabase()` (`createClient` from `@supabase/supabase-js`, `SURFBALLERS_SUPABASE_URL` + `SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY`). If either env var is missing, the route returns a well-formed empty payload with `meta.dataPresent=false` + a clear reason — never throws (so the build + deploy succeed before Bill provisions the keys).
- **AC — Nav:** `Navigation.tsx` `apps` Surfballers entry enabled → `/surfballers`; `navItems` gains a Surfballers sidebar entry with an inline SVG icon (w-5 h-5, stroke currentColor), active-state on `pathname==='/surfballers'`. Existing `/costs` + other routes untouched.

### US-E2 — The 5 views (thin div-chart consumers of the route JSON)
Rendered inside `SurfballersDashboard.tsx` (may extract per-view components under `src/components/surfballers/`). All consume the single route payload; aggregation already done server-side (do NOT re-query from the browser).
- **Unit Economics** — cost per user (grain=user) and cost per league (grain=league): stat cards (total $, blended $/user, $/call) + a per-user / per-league bar list. 2 users today → render cleanly at tiny N.
- **Call & Tool Cost Breakdown** — cost per assistant call (grain=call): a distribution/bar of per-call total_cost + summary (avg $/call, p?? if trivial). Tool-COST section omitted or labeled "cost not attributable per-tool (llm_call tokens aren't tool-scoped)" per the #1003 note — do not fabricate per-tool cost.
- **Tool Popularity** — from `assistant_events` tool_call rows: COUNT by `tool_name`, a horizontal bar ranking + a count-over-time mini bar (MonthlyChart idiom). This is the real per-tool surface.
- **Intent Explorer** — stacked/grouped bars of the 8 intent labels over the range (join intent_classification→assistant_events); clicking/expanding a label shows a few sample `prompt_truncated` snippets (truncated text only, with the opaque user_id hash, never full prompt/PII).
- **Raw drill-down** — paginated event-level table (created_at, event, model, tokens, latency, status, tool_name, truncated prompt). Server-paginated via the route's `.range()`. This is the ONLY view that shows the truncated prompt text.
- **AC — Range + responsive:** a range selector (e.g. 7d / 30d / 90d / 13mo) re-fetches the route; layout responsive (mobile bottom-tabs nav already handles small screens; cards stack). Loading skeleton + empty states mirror `CostsDashboard`.

## Verification
- **Commands:** `npm run build` (Next 16 production build MUST pass — catches App Router / Suspense / server-vs-client boundary errors that `tsc` alone misses), `npm run lint`, `npm test` (Vitest — add a route-handler test mirroring `src/app/api/costs/sync/__tests__/route.test.ts`: mock `@supabase/supabase-js` createClient + env vars, assert (a) empty payload shape when tables empty, (b) aggregation math for a seeded multi-row fixture, (c) 200-not-500 when env vars absent).
- **Manual steps (post-build, pre-Review):** `npm run dev` → log in as an allowlisted account → `/surfballers` renders all 5 view shells with empty states (data may be absent until C/D cron runs in prod) → confirm no console errors, no white-flash, existing `/costs` still works, non-allowlisted account is bounced from `/surfballers`. Per feedback_pipeline_verify_includes_user_flow — walk the authenticated page, not just a green build.
- **expected_outputs:** build green; Vitest green; `/surfballers` live page shows the 5 views; nav shows Surfballers enabled; `/api/surfballers/analytics` returns 200 JSON (empty-but-well-formed if keys unset).

## Deploy dependency (Gate-2, flag — NOT a build blocker)
- **New env vars** `SURFBALLERS_SUPABASE_URL` (= `https://qmczddecbywdinwxepjd.supabase.co`) + `SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY` (the Surfballers project's legacy-format service-role key — NOT sb_) must be added to HQ's Vercel env **by Bill at deploy time**. The build + the route are designed to no-op gracefully (empty payload) until they exist, so Review/local-verify do not need them. Document the exact `vercel env add` steps in the PR. **Flag to Bill at Gate-2.**
- Deploy is manual `vercel --prod` (no CI in empire-hq). This is a Gate-2 step gated on Bill's ship word for the whole epic.

## Out of scope
- No writes of any kind (feedback is Card F, in the Surfballers app).
- No enforcement/quotas/alerts. Observability-of-the-dashboard not needed (read-only, 2 viewers).
- No per-tool COST attribution (data can't support it; tool popularity COUNT is the substitute).
- No changes to the Surfballers project schema or RLS.

## Rebase note
Base off `main` of empire-hq (this repo is independent of the surfballers-supabase A–D branches — different repo). No cross-branch chaining needed here. The data it reads reaches prod when the Surfballers epic's C/D migrations deploy; E is coded null-safe so it ships independently of that timing.
