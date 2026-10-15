# Code Review — Card #1005: Surfballers analytics dashboard in Empire-HQ

- **Reviewer:** Maya
- **Date:** 2026-10-15
- **Card:** #1005 (Epic #1000, Child E)
- **Branch:** `feature/1005-surfballers-analytics-dashboard` @ `2e2ef3c`
- **Repo:** `/Users/zak/Projects/empire-hq`
- **PRD:** `docs/PRD/PRD-1005-surfballers-analytics-dashboard.md`
- **Builder:** Logan

## Verdict: 🟡 CONDITIONAL

One AC miss (Intent Explorer sample-prompt drill-down is a stub, not the PRD-specified `intent_classification → assistant_events` join) plus one minor payload-semantics nit. **All security, auth, null-safety, and never-500 constraints PASS.** The must-fix is conservative (it currently shows *less* data, so there is no PII/deploy risk), which is why this is CONDITIONAL and not BLOCKED.

## Executable gates (re-run, confirmed)

| Gate | Result |
|------|--------|
| `npm run build` (Next 16 prod) | ✅ PASS — `○ /surfballers` and `ƒ /api/surfballers/analytics` both materialize; all pre-existing routes intact |
| `npm test` (Vitest) | ✅ 33/33 PASS (8 new route tests included) |
| `npx eslint` on all new files + Navigation.tsx | ✅ clean (the 2 known lint errors are pre-existing in `src/components/costs/ProviderDetailCard.tsx`, not in this diff) |

## Locked-decision / security checklist

1. **Server-side service-role only** — ✅ `src/lib/surfballers/client.ts` reads `SURFBALLERS_SUPABASE_URL` + `SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY`. Grep confirms the client/key is imported ONLY in the route handler, never a `'use client'` component, and never exposed as `NEXT_PUBLIC`. Browser only ever `fetch('/api/surfballers/analytics')`.
2. **Null-safe / never-500** — ✅ `isSurfballersConfigured()` gate at route top returns a 200 well-formed empty payload with `meta.dataPresent=false` + `reason` when env vars unset. Every query result is read via `.data ?? []` (no `.data.map` null-deref anywhere). Absent/empty tables degrade to empty sections, 200. Covered by two dedicated tests (empty-tables + env-absent).
3. **Auth-gated** — ✅ Neither `/surfballers` nor `/api/surfballers/analytics` is in `middleware.ts`'s skip list (skip list is `/login`, `/api/auth`, `/api/costs/sync`, `/auth/callback`, `/_next`, `/favicon.ico`). Both inherit the `ALLOWED_EMAILS` (`billd@`, `erics@getleveredup.com`) gate; non-allowlisted accounts are signed out and bounced to `/login?error=unauthorized`.
4. **PII** — ✅ `user_id` rendered only as the opaque hash, truncated to 12 chars in RawEventsView; never decoded/joined to a name. `prompt_truncated` appears ONLY in RawEventsView — verified by the `never includes prompt_truncated outside rawEvents` test asserting it's absent from toolPopularity and intents. No `admin_api_costs` read anywhere in the diff.
5. **Bounded queries** — ✅ All three rollup reads + the tool-events read + the intent read use `.limit(1000)`; raw events use `.range(page*50, …)` pagination. No unbounded select.
6. **tool-grain degeneracy** — ✅ CallToolCostView derives cost from the `call` grain (NOT the degenerate `tool` grain) and explicitly renders the "Per-tool cost breakdown is not available — LLM token costs are not scoped to individual tool invocations" note. Tool POPULARITY comes from `COUNT(assistant_events WHERE event='tool_call')` by `tool_name` in the route. Exactly per the #1003 note.
7. **Intent join / taxonomy** — ⚠️ See Must-fix #1. Intent *counts* aggregate correctly from `intent_classification`, and the 8-label taxonomy is honored in the color map. But the per-label drill-down does NOT perform the specified `intent_classification → assistant_events` join to surface sample `prompt_truncated` snippets — it renders a placeholder message instead.
8. **React hooks order** — ✅ In SurfballersDashboard all 6 `useState` + `useCallback` + `useEffect` are declared before the single `return`; no early return between hooks. IntentExplorerView/RawEventsView `useState` at top. Clean.
9. **Pattern fidelity** — ✅ No charting lib added to `package.json` (confirmed via diff). Hand-built div/Tailwind bars, `bg-card-bg border border-border rounded-lg p-6` stat shells, `text-2xl font-bold`, theme tokens + `#00A8E8` accent, loading skeleton + empty states mirror CostsDashboard. Responsive (range selector wraps, tabs `overflow-x-auto`, cards stack on mobile).
10. **Navigation.tsx** — ✅ `apps[]` Surfballers entry flipped from `disabled:true/href:'#'` to `href:'/surfballers'/current:false`; `navItems[]` gains a Surfballers entry with inline `w-5 h-5 stroke=currentColor` SVG and `pathname==='/surfballers'` active state. `/costs` and all other routes untouched (build confirms).

## Findings

### 🟡 Must-fix

**M1 — Intent Explorer drill-down is a stub, not the PRD-specified join.**
`IntentExplorerView.tsx:90-95` renders a static placeholder ("Sample prompts load from the raw events view — filter by intent label there to see full context.") when a label is expanded. The PRD (US-E2 Intent Explorer AC) and the orchestrator's review focus #7 require joining `intent_classification → assistant_events` on `event_id` so expanding a label shows a few sample `prompt_truncated` snippets (truncated text + opaque hash only). The route never reads this join — it only counts labels. Additionally, the raw events view the placeholder points users to has **no intent-label filter**, so the referenced workflow doesn't actually exist.
*Fix:* In the route, join (or second-query) `assistant_events` by the `event_id`s of each label's classifications, select `prompt_truncated` + hashed `user_id` only, cap at a few per label, and return them in `intents.byLabel[].samples`. Render them in the expanded panel. Keep it truncated-text-only (no full prompt, no decoded user_id) — the existing PII discipline must carry over.

### 🟢 Nice-to-fix (non-blocking)

**N1 — `rawEvents.total` is a page length, not a grand total.** `route.ts:242` sets `total: eventsData.length` (≤50, the current page size), not the true row count. Pagination still works correctly because `RawEventsView` computes `hasNext` from `events.length === pageSize` (not from `total`), so this is payload-cosmetic only. Either compute a real count (`{ count: 'exact', head: true }` on a parallel query) or rename the field to `pageCount` to avoid a future consumer misreading it.

**N2 — Intent labels are not validated against the locked 8-label taxonomy.** The route counts whatever labels appear in `intent_classification`; an unexpected label would render with the fallback color. This is acceptable (Card D owns taxonomy enforcement upstream) but a defensive filter/known-set check would harden the view. Non-blocking.

## Recommendation

Route **M1 back to Logan** for the intent-join drill-down (and the matching route payload field). N1/N2 are optional polish that can ride along or be deferred. Once M1 lands, re-review (focus: the new join stays truncated-text + hashed-id only, bounded query, null-safe), then the orchestrator does the live dev-server user-flow walk per `feedback_post_maya_local_test` before 👀 Review.

The Gate-2 deploy dependency (new `SURFBALLERS_SUPABASE_URL` + `SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY` Vercel env vars, provisioned by Bill at ship time) is correctly designed as a no-op-until-present graceful degradation — not a build/review blocker.
