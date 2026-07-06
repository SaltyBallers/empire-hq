---
trello_card_short: 626
trello_list: "In Progress"
trello_labels: ["getleveredup"]
project: empire-hq
title: "Phase 4a Workstream B — Empire-HQ Cost Dashboard, Syncs, Domain/Auth"
slug: empire-hq-cost-dashboard
branch_name: feature/626-cost-dashboard
epic: 608
parent_prd: "getleveredup/docs/PRD/PRD-626-cost-usage-metering.md"
created_at: 2026-07-06T00:00:00Z
updated_at: 2026-07-06T00:00:00Z
dispatch_readiness:
  repo_path: "/Users/zak/Projects/empire-hq"
  base_branch: main
  target_agent: "duke"
  do_not_touch:
    - "NO enforcement / quotas / call-blocking anywhere. 4a is OBSERVABILITY ONLY."
    - "Do NOT store customer PII in cost tables — per-account attribution is by ghl_location_id ONLY (never contact names/phones)."
    - "Do NOT break the existing empire-hq.vercel.app deploy or the existing project-spend dashboard view — this is ADDITIVE."
    - "Do NOT invent OpenAI Costs API / Twilio usage payload shapes — hit the real API, capture the verbatim response, and code against that (Data Shape Rule)."
    - "Do NOT hardcode subscription $ amounts as magic numbers scattered in code — put them in the provider registry / manual-recurring pattern."
---

# PRD-626b — Empire-HQ Cost Dashboard (Workstream B)

**Parent:** PRD-626 (getleveredup) — the shared cost model, rate table, and per-account attribution contract live there. **Read PRD-626 §3 (cost model) and §4 Workstream B before starting.** This slice is the empire-hq half.

**Sibling 626a (getleveredup voice pipeline) is DONE + Maya-approved.** It added the `voice_cost_monthly_by_account` SQL VIEW (migration `20260706142400_...`) to the shared Supabase (`xvdxuerzyscsoekwztbp`). That view is B3's data source. It reaches prod Supabase when #626 merges — so B3 is coded against the view contract and null-safe if the view isn't present yet; live-verify of B3 happens post-merge alongside A.

## Current state (verified 2026-07-06)
- Live Next.js 16 app, Vercel (`empire-hq.vercel.app`), Google OAuth. Dormant since 2026-03-09.
- `src/middleware.ts:32` — `ALLOWED_EMAILS = ['surfballers@gmail.com']`.
- `src/types/costs.ts` — `ALL_PROVIDERS` (11: anthropic, openai, brave, exa, perplexity, moonshot, gemini, lovable, vercel, supabase, apify), `MONTHLY_BUDGET`, provider display config (`hasApi`, `dashboardUrl`).
- `src/lib/costs/sync.ts` — sync logic → `admin_api_costs` table. 3 provider pulls wired (Moonshot balance, Vercel charges, Anthropic cost_report).
- `src/components/costs/` — `CostsDashboard.tsx`, `CostSummaryCards.tsx`, `ManualCostEntry.tsx` (custom SVG charts, manual-entry form).
- `src/app/api/costs/` — sync route (already excluded from auth middleware for cron).
- `docs/research/313-provider-cost-apis.md` — prior provider-API research; read it, it may save time.

## User Stories

### US-B1 — Reactivate & verify existing syncs
- **AC:** Run the Moonshot / Vercel / Anthropic syncs against current APIs. Fix any drift (dormant ~4 months; endpoints/keys/response shapes may have moved). Record verified request/response shapes in a research doc.
- **AC:** A missing/expired key degrades gracefully (that provider is skipped + flagged in the sync result), never crashes the whole sync.

### US-B2 — Add missing providers
- **AC (Type B — usage, real $ via API):** Add **OpenAI** (Costs/Usage API → actual $) and **Twilio** (usage records → actual $) syncs → `admin_api_costs`. Hit the real API, code against the verbatim payload.
- **AC (Type A — fixed recurring subscription):** Add **Fly.io, Supabase, Axiom** as configured flat monthly line items that auto-populate each month via the existing manual/recurring pattern (no scraping). Amounts are config-driven; if Bill hasn't confirmed a number yet, seed a clearly-labeled placeholder and flag it — do NOT guess silently.
- **AC:** `src/types/costs.ts` provider registry reflects the getleveredup vendor set (add openai already present; add twilio, fly, axiom) with `MONTHLY_BUDGET` entries + display config.

### US-B3 — Voice cost view (reads 626a)
- **AC:** A dashboard view surfaces the per-account rollup from `voice_cost_monthly_by_account`: per `ghl_location_id` → minutes, call count, total `estimated_cost_usd`, blended $/min, plus a project total. Sits BESIDE the existing project-spend view (additive, reuse existing card/SVG-chart components).
- **AC:** Null-safe: if the view is absent (pre-#626-merge) or empty, render an empty/"no data yet" state, never error. Bounded query (`.limit`) per the PostgREST 1000-row rule.
- **AC:** No customer PII — display `ghl_location_id` (or a friendly location label if already available in a non-PII projection), never contact names/phones.

### US-B4 — Domain + auth
- **AC:** `src/middleware.ts` allowlist = `['billd@getleveredup.com', 'erics@getleveredup.com']`; remove `surfballers@gmail.com`. Update any `ADMIN_EMAIL`/sync-trigger gate to match.
- **AC:** empire-hq served at **hq.getleveredup.com** (Vercel domain add + DNS CNAME). Document the exact Vercel domain-add + DNS record steps in the PR — the DNS/Vercel domain wiring itself is Bill/Zak to execute (needs registrar access); Duke prepares config + instructions and verifies once DNS is live.
- **AC:** Verify the full user flow live (log in as a getleveredup Workspace account → dashboard → cost data visible; a non-allowlisted account is bounced). Per feedback_pipeline_verify_includes_user_flow.

## Build-time open items (flag, don't block)
1. OpenAI Costs API + Twilio usage-record auth — confirm which env keys exist in empire-hq; add `OPENAI_ADMIN_API_KEY` / `TWILIO_ACCOUNT_SID`+`TWILIO_AUTH_TOKEN` if missing (flag to Bill).
2. Fixed monthly $ for Supabase / Axiom / Vercel / Fly — Bill to confirm; placeholder + flag until then.
3. hq.getleveredup.com DNS/registrar step needs Bill/Zak.

## Definition of done
- hq.getleveredup.com loads for both allowlisted accounts, bounces others, shows project-wide vendor spend (Types A+B) AND the per-account voice cost view (Type C, $/min + $/mo).
- Existing `empire-hq.vercel.app` still works; existing project-spend view intact.
- Verified provider payload shapes + subscription amounts documented with source/as-of date.
- Zero enforcement code. No customer PII in cost data.
