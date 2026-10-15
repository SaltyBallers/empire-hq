import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase mock ---

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockOrder = vi.fn()
const mockLimit = vi.fn()
const mockRange = vi.fn()
const mockIn = vi.fn()

function makeChainable(terminal: () => unknown, sampleTerminal: () => unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = (..._args: unknown[]) => { mockEq(..._args); return chain }
  chain.gte = (..._args: unknown[]) => { mockGte(..._args); return chain }
  chain.order = (..._args: unknown[]) => { mockOrder(..._args); return chain }
  chain.limit = (..._args: unknown[]) => { mockLimit(..._args); return terminal() }
  chain.range = (..._args: unknown[]) => { mockRange(..._args); return terminal() }
  // The intent sample drill-down query terminates on `.in('id', ids)`.
  chain.in = (..._args: unknown[]) => { mockIn(..._args); return sampleTerminal() }
  return chain
}

let tableFixtures: Record<string, unknown[]> = {}
// Served by the `.in('id', ...)` sample drill-down query against assistant_events.
let sampleEventFixtures: unknown[] = []

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockSelect(table)
      return makeChainable(
        () => ({ data: tableFixtures[table] ?? [], error: null }),
        () => ({ data: sampleEventFixtures, error: null }),
      )
    },
  }),
}))

function makeRequest(range?: string, page?: string): NextRequest {
  const url = new URL('http://localhost/api/surfballers/analytics')
  if (range) url.searchParams.set('range', range)
  if (page) url.searchParams.set('page', page)
  return new NextRequest(url.toString())
}

describe('GET /api/surfballers/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    tableFixtures = {}
    sampleEventFixtures = []
    process.env.SURFBALLERS_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  it('returns 200 with empty-but-well-formed payload when all tables empty', async () => {
    tableFixtures = {}
    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('unitEconomics')
    expect(body).toHaveProperty('callToolCost')
    expect(body).toHaveProperty('toolPopularity')
    expect(body).toHaveProperty('intents')
    expect(body).toHaveProperty('rawEvents')
    expect(body).toHaveProperty('meta')
    expect(body.meta.dataPresent).toBeDefined()
    expect(body.unitEconomics.byUser).toEqual([])
    expect(body.unitEconomics.byLeague).toEqual([])
    expect(body.callToolCost.calls).toEqual([])
    expect(body.toolPopularity.byTool).toEqual([])
    expect(body.intents.byLabel).toEqual([])
    expect(body.rawEvents.events).toEqual([])
  })

  it('returns well-formed empty payload when env vars absent', async () => {
    delete process.env.SURFBALLERS_SUPABASE_URL
    delete process.env.SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.meta.dataPresent).toBe(false)
    expect(body.meta.reason).toBeTruthy()
    expect(body.unitEconomics.byUser).toEqual([])
    expect(body.rawEvents.events).toEqual([])
  })

  it('aggregates unit economics correctly from seeded fixture', async () => {
    tableFixtures['assistant_cost_rollup'] = [
      { grain: 'user', key: 'abc123', window_start: '2026-09-01T00:00:00Z', window_end: '2026-09-30T00:00:00Z', token_cost: 0.01, infra_cost: 0.002, total_cost: 0.012 },
      { grain: 'user', key: 'abc123', window_start: '2026-08-01T00:00:00Z', window_end: '2026-08-31T00:00:00Z', token_cost: 0.008, infra_cost: 0.001, total_cost: 0.009 },
      { grain: 'user', key: 'def456', window_start: '2026-09-01T00:00:00Z', window_end: '2026-09-30T00:00:00Z', token_cost: 0.005, infra_cost: 0.001, total_cost: 0.006 },
    ]

    const { GET } = await import('../route')
    const res = await GET(makeRequest('30d'))
    const body = await res.json()

    const abc = body.unitEconomics.byUser.find((u: { key: string }) => u.key === 'abc123')
    const def_ = body.unitEconomics.byUser.find((u: { key: string }) => u.key === 'def456')
    expect(abc).toBeDefined()
    expect(abc.total_cost).toBeCloseTo(0.021, 6)
    expect(def_).toBeDefined()
    expect(def_.total_cost).toBeCloseTo(0.006, 6)
    expect(body.unitEconomics.totals.userCount).toBe(2)
    expect(body.unitEconomics.totals.totalCost).toBeCloseTo(0.027, 6)
  })

  it('aggregates tool popularity from seeded fixture', async () => {
    tableFixtures['assistant_events'] = [
      { tool_name: 'get_roster', created_at: '2026-09-15T10:00:00Z', event: 'tool_call' },
      { tool_name: 'get_roster', created_at: '2026-09-16T10:00:00Z', event: 'tool_call' },
      { tool_name: 'get_waiver_wire', created_at: '2026-09-17T10:00:00Z', event: 'tool_call' },
    ]

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    const body = await res.json()

    const roster = body.toolPopularity.byTool.find((t: { name: string }) => t.name === 'get_roster')
    expect(roster).toBeDefined()
    expect(roster.count).toBe(2)
    expect(body.toolPopularity.totalToolCalls).toBe(3)
  })

  it('aggregates intent counts from seeded fixture', async () => {
    tableFixtures['intent_classification'] = [
      { id: '1', event_id: 'a', label: 'lineup-advice', confidence: 0.9, model: 'gpt-4', classified_at: '2026-09-15T10:00:00Z' },
      { id: '2', event_id: 'b', label: 'waiver-research', confidence: 0.85, model: 'gpt-4', classified_at: '2026-09-16T10:00:00Z' },
      { id: '3', event_id: 'c', label: 'lineup-advice', confidence: 0.92, model: 'gpt-4', classified_at: '2026-09-17T10:00:00Z' },
    ]

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    const body = await res.json()

    const lineup = body.intents.byLabel.find((l: { label: string }) => l.label === 'lineup-advice')
    expect(lineup).toBeDefined()
    expect(lineup.count).toBe(2)
    expect(body.intents.totalClassified).toBe(3)
  })

  it('surfaces per-label sample prompts via the assistant_events join (truncated prompt + hashed user only)', async () => {
    // 4 lineup-advice classifications → only the first 3 event_ids become samples.
    tableFixtures['intent_classification'] = [
      { id: 'c1', event_id: 'e1', label: 'lineup-advice', confidence: 0.9, model: 'gpt-4', classified_at: '2026-09-18T10:00:00Z' },
      { id: 'c2', event_id: 'e2', label: 'lineup-advice', confidence: 0.9, model: 'gpt-4', classified_at: '2026-09-17T10:00:00Z' },
      { id: 'c3', event_id: 'e3', label: 'lineup-advice', confidence: 0.9, model: 'gpt-4', classified_at: '2026-09-16T10:00:00Z' },
      { id: 'c4', event_id: 'e4', label: 'lineup-advice', confidence: 0.9, model: 'gpt-4', classified_at: '2026-09-15T10:00:00Z' },
      { id: 'c5', event_id: 'e5', label: 'waiver-research', confidence: 0.85, model: 'gpt-4', classified_at: '2026-09-14T10:00:00Z' },
    ]
    // assistant_events rows served by the `.in('id', ...)` sample query.
    // Includes a full prompt + response fields that MUST NOT leak into samples.
    sampleEventFixtures = [
      { id: 'e1', prompt_truncated: 'who should I start at FLEX', user_id: 'hash_aaaaaaaaaaaaaa', prompt: 'FULL PROMPT LEAK', response_truncated: 'RESPONSE LEAK' },
      { id: 'e2', prompt_truncated: 'is my RB a good start', user_id: 'hash_bbbbbbbbbbbbbb' },
      { id: 'e3', prompt_truncated: 'bench or start my TE', user_id: 'hash_cccccccccccccc' },
      { id: 'e5', prompt_truncated: 'best waiver pickup QB', user_id: 'hash_dddddddddddddd' },
    ]

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    const body = await res.json()

    const lineup = body.intents.byLabel.find((l: { label: string }) => l.label === 'lineup-advice')
    expect(lineup).toBeDefined()
    expect(lineup.count).toBe(4)
    // Capped at 3 samples per label.
    expect(lineup.samples).toHaveLength(3)
    // Only prompt_truncated + user_id present per sample — no other fields.
    for (const s of lineup.samples) {
      expect(Object.keys(s).sort()).toEqual(['prompt_truncated', 'user_id'])
    }
    // The samples use the first 3 event_ids seen (e1, e2, e3), not e4.
    expect(lineup.samples.map((s: { prompt_truncated: string }) => s.prompt_truncated)).toEqual([
      'who should I start at FLEX',
      'is my RB a good start',
      'bench or start my TE',
    ])

    const waiver = body.intents.byLabel.find((l: { label: string }) => l.label === 'waiver-research')
    expect(waiver.samples).toHaveLength(1)
    expect(waiver.samples[0].prompt_truncated).toBe('best waiver pickup QB')

    // PII discipline: no full prompt, no response text leaks anywhere in intents.
    const intentsStr = JSON.stringify(body.intents)
    expect(intentsStr).not.toContain('FULL PROMPT LEAK')
    expect(intentsStr).not.toContain('RESPONSE LEAK')
    expect(intentsStr).not.toContain('response_truncated')
  })

  it('range param is echoed in meta', async () => {
    const { GET } = await import('../route')
    const res = await GET(makeRequest('7d'))
    const body = await res.json()
    expect(body.meta.range).toBe('7d')
  })

  it('defaults to 30d for unknown range param', async () => {
    const { GET } = await import('../route')
    const res = await GET(makeRequest('invalid'))
    const body = await res.json()
    expect(body.meta.range).toBe('30d')
  })

  it('never includes prompt_truncated outside rawEvents', async () => {
    tableFixtures['assistant_events'] = [
      {
        id: 'evt1', created_at: '2026-09-15T10:00:00Z', event: 'tool_call',
        tool_name: 'get_roster', user_id: 'abc123', model: 'gpt-4',
        input_tokens: 100, output_tokens: 50, total_tokens: 150,
        latency_ms: 200, status: 'ok', prompt_truncated: 'SENSITIVE TEXT',
        correlation_id: null, league_id: null,
      },
    ]

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    const body = await res.json()

    const bodyStr = JSON.stringify(body.toolPopularity)
    expect(bodyStr).not.toContain('SENSITIVE TEXT')
    const bodyStrIntents = JSON.stringify(body.intents)
    expect(bodyStrIntents).not.toContain('SENSITIVE TEXT')
  })
})
