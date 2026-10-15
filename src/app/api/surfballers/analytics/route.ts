import { NextRequest, NextResponse } from 'next/server'
import { getSurfballersSupabase, isSurfballersConfigured } from '@/lib/surfballers/client'

// --- Types ---

export type RangeOption = '7d' | '30d' | '90d' | '13mo'

interface UnitEconomicsRow {
  grain: string
  key: string
  window_start: string
  window_end: string
  openai_cost: number
  infra_cost: number
  total_cost: number
}

interface AssistantEvent {
  id: string
  created_at: string
  event: 'llm_call' | 'tool_call'
  correlation_id: string | null
  user_id: string
  league_id: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  finish_reason: string | null
  latency_ms: number | null
  tool_name: string | null
  arg_bytes: number | null
  status: string | null
  error_message: string | null
  prompt_sha256: string | null
  prompt_truncated: string | null
  response_truncated: string | null
}

interface IntentRow {
  id: string
  event_id: string
  label: string
  confidence: number
  model: string | null
  classified_at: string
}

// --- Range helpers ---

function rangeToWindowStart(range: RangeOption): string {
  const now = new Date()
  switch (range) {
    case '7d':
      now.setDate(now.getDate() - 7)
      break
    case '30d':
      now.setDate(now.getDate() - 30)
      break
    case '90d':
      now.setDate(now.getDate() - 90)
      break
    case '13mo':
      now.setMonth(now.getMonth() - 13)
      break
  }
  return now.toISOString()
}

function parseRange(raw: string | null): RangeOption {
  if (raw === '7d' || raw === '30d' || raw === '90d' || raw === '13mo') return raw
  return '30d'
}

// --- Route handler ---

export async function GET(request: NextRequest) {
  if (!isSurfballersConfigured()) {
    return NextResponse.json({
      unitEconomics: { byUser: [], byLeague: [], totals: { totalCost: 0, userCount: 0, leagueCount: 0 } },
      callToolCost: { calls: [], avgCallCost: 0, totalCallCost: 0 },
      toolPopularity: { byTool: [], totalToolCalls: 0 },
      intents: { byLabel: [], totalClassified: 0 },
      rawEvents: { events: [], total: 0, page: 0, pageSize: 50 },
      meta: {
        range: '30d',
        generatedAt: new Date().toISOString(),
        dataPresent: false,
        reason: 'SURFBALLERS_SUPABASE_URL or SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY not configured',
      },
    })
  }

  const { searchParams } = new URL(request.url)
  const range = parseRange(searchParams.get('range'))
  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const pageSize = 50
  const windowStart = rangeToWindowStart(range)
  const supabase = getSurfballersSupabase()

  // --- Unit Economics (grain=user, grain=league) ---
  const [userRollup, leagueRollup, callRollup, toolEvents, intentRows, rawPage] = await Promise.all([
    supabase
      .from('assistant_cost_rollup')
      .select('grain,key,window_start,window_end,openai_cost,infra_cost,total_cost')
      .eq('grain', 'user')
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1000),

    supabase
      .from('assistant_cost_rollup')
      .select('grain,key,window_start,window_end,openai_cost,infra_cost,total_cost')
      .eq('grain', 'league')
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1000),

    supabase
      .from('assistant_cost_rollup')
      .select('grain,key,window_start,window_end,openai_cost,infra_cost,total_cost')
      .eq('grain', 'call')
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1000),

    supabase
      .from('assistant_events')
      .select('tool_name,created_at')
      .eq('event', 'tool_call')
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('intent_classification')
      .select('id,event_id,label,confidence,model,classified_at')
      .gte('classified_at', windowStart)
      .order('classified_at', { ascending: false })
      .limit(1000),

    supabase
      .from('assistant_events')
      .select(
        'id,created_at,event,model,input_tokens,output_tokens,total_tokens,latency_ms,status,tool_name,prompt_truncated,user_id,correlation_id'
      )
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1),
  ])

  // --- Aggregate: Unit Economics ---
  const userRows: UnitEconomicsRow[] = userRollup.data ?? []
  const leagueRows: UnitEconomicsRow[] = leagueRollup.data ?? []

  const byUserMap = new Map<string, number>()
  for (const row of userRows) {
    byUserMap.set(row.key, (byUserMap.get(row.key) ?? 0) + Number(row.total_cost))
  }
  const byLeagueMap = new Map<string, number>()
  for (const row of leagueRows) {
    byLeagueMap.set(row.key, (byLeagueMap.get(row.key) ?? 0) + Number(row.total_cost))
  }

  const byUser = Array.from(byUserMap.entries())
    .map(([key, total_cost]) => ({ key, total_cost }))
    .sort((a, b) => b.total_cost - a.total_cost)

  const byLeague = Array.from(byLeagueMap.entries())
    .map(([key, total_cost]) => ({ key, total_cost }))
    .sort((a, b) => b.total_cost - a.total_cost)

  const totalCost = byUser.reduce((s, r) => s + r.total_cost, 0)

  const unitEconomics = {
    byUser,
    byLeague,
    totals: {
      totalCost,
      userCount: byUser.length,
      leagueCount: byLeague.length,
    },
  }

  // --- Aggregate: Call & Tool Cost ---
  const callRows: UnitEconomicsRow[] = callRollup.data ?? []
  const calls = callRows
    .map(r => ({ key: r.key, total_cost: Number(r.total_cost), window_start: r.window_start }))
    .sort((a, b) => b.total_cost - a.total_cost)

  const totalCallCost = calls.reduce((s, r) => s + r.total_cost, 0)
  const avgCallCost = calls.length > 0 ? totalCallCost / calls.length : 0

  const callToolCost = { calls, avgCallCost, totalCallCost }

  // --- Aggregate: Tool Popularity ---
  const toolCounts = new Map<string, number>()
  for (const ev of (toolEvents.data ?? [])) {
    const name = ev.tool_name ?? 'unknown'
    toolCounts.set(name, (toolCounts.get(name) ?? 0) + 1)
  }
  const byTool = Array.from(toolCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const toolPopularity = {
    byTool,
    totalToolCalls: byTool.reduce((s, t) => s + t.count, 0),
  }

  // --- Aggregate: Intents ---
  const SAMPLES_PER_LABEL = 3
  const intentClassifications = (intentRows.data as IntentRow[] ?? [])

  const intentCounts = new Map<string, number>()
  // Collect up to SAMPLES_PER_LABEL event_ids per label, deterministically:
  // intentClassifications are ordered classified_at DESC, so take the first N seen.
  const eventIdsByLabel = new Map<string, string[]>()
  for (const row of intentClassifications) {
    intentCounts.set(row.label, (intentCounts.get(row.label) ?? 0) + 1)
    const ids = eventIdsByLabel.get(row.label) ?? []
    if (ids.length < SAMPLES_PER_LABEL && row.event_id) {
      ids.push(row.event_id)
      eventIdsByLabel.set(row.label, ids)
    }
  }

  // Bounded, de-duplicated list of event_ids we actually need (≤ 3 per label).
  const neededEventIds = Array.from(
    new Set(Array.from(eventIdsByLabel.values()).flat())
  )

  // One additional query to pull truncated prompt + hashed user_id for samples.
  // Only prompt_truncated + opaque hashed user_id leave this route — no full prompt, no other PII.
  const sampleEventMap = new Map<string, { prompt_truncated: string | null; user_id: string }>()
  if (neededEventIds.length > 0) {
    const sampleEvents = await supabase
      .from('assistant_events')
      .select('id,prompt_truncated,user_id')
      .in('id', neededEventIds)
    for (const ev of (sampleEvents.data ?? []) as { id: string; prompt_truncated: string | null; user_id: string }[]) {
      sampleEventMap.set(ev.id, { prompt_truncated: ev.prompt_truncated, user_id: ev.user_id })
    }
  }

  const byLabel = Array.from(intentCounts.entries())
    .map(([label, count]) => {
      const samples: { prompt_truncated: string; user_id: string }[] = []
      for (const eid of (eventIdsByLabel.get(label) ?? [])) {
        const ev = sampleEventMap.get(eid)
        // Skip if prompt_truncated is null; pass user_id (opaque hash) through as-is.
        if (ev && ev.prompt_truncated != null) {
          samples.push({ prompt_truncated: ev.prompt_truncated, user_id: ev.user_id })
        }
      }
      return { label, count, samples }
    })
    .sort((a, b) => b.count - a.count)

  const intents = {
    byLabel,
    totalClassified: byLabel.reduce((s, l) => s + l.count, 0),
  }

  // --- Raw events (paginated, includes prompt_truncated) ---
  const eventsData: AssistantEvent[] = (rawPage.data ?? []) as AssistantEvent[]
  const rawEvents = {
    events: eventsData.map(ev => ({
      id: ev.id,
      created_at: ev.created_at,
      event: ev.event,
      model: ev.model,
      input_tokens: ev.input_tokens,
      output_tokens: ev.output_tokens,
      total_tokens: ev.total_tokens,
      latency_ms: ev.latency_ms,
      status: ev.status,
      tool_name: ev.tool_name,
      prompt_truncated: ev.prompt_truncated,
      user_id: ev.user_id,
    })),
    total: eventsData.length,
    page,
    pageSize,
  }

  return NextResponse.json({
    unitEconomics,
    callToolCost,
    toolPopularity,
    intents,
    rawEvents,
    meta: {
      range,
      generatedAt: new Date().toISOString(),
      dataPresent: {
        unitEconomics: byUser.length > 0 || byLeague.length > 0,
        callToolCost: calls.length > 0,
        toolPopularity: byTool.length > 0,
        intents: byLabel.length > 0,
        rawEvents: eventsData.length > 0,
      },
    },
  })
}
