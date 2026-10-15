'use client'

import { useCallback, useEffect, useState } from 'react'
import { UnitEconomicsView } from './UnitEconomicsView'
import { CallToolCostView } from './CallToolCostView'
import { ToolPopularityView } from './ToolPopularityView'
import { IntentExplorerView } from './IntentExplorerView'
import { RawEventsView } from './RawEventsView'

type RangeOption = '7d' | '30d' | '90d' | '13mo'
type ViewTab = 'unit-economics' | 'call-cost' | 'tool-popularity' | 'intents' | 'raw-events'

const RANGE_OPTIONS: { label: string; value: RangeOption }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '13mo', value: '13mo' },
]

const TABS: { label: string; value: ViewTab }[] = [
  { label: 'Unit Economics', value: 'unit-economics' },
  { label: 'Call & Tool Cost', value: 'call-cost' },
  { label: 'Tool Popularity', value: 'tool-popularity' },
  { label: 'Intent Explorer', value: 'intents' },
  { label: 'Raw Events', value: 'raw-events' },
]

interface AnalyticsPayload {
  unitEconomics: {
    byUser: { key: string; total_cost: number }[]
    byLeague: { key: string; total_cost: number }[]
    totals: { totalCost: number; userCount: number; leagueCount: number }
  }
  callToolCost: {
    calls: { key: string; total_cost: number; window_start: string }[]
    avgCallCost: number
    totalCallCost: number
  }
  toolPopularity: {
    byTool: { name: string; count: number }[]
    totalToolCalls: number
  }
  intents: {
    byLabel: { label: string; count: number }[]
    totalClassified: number
  }
  rawEvents: {
    events: {
      id: string
      created_at: string
      event: string
      model: string | null
      input_tokens: number | null
      output_tokens: number | null
      total_tokens: number | null
      latency_ms: number | null
      status: string | null
      tool_name: string | null
      prompt_truncated: string | null
      user_id: string
    }[]
    total: number
    page: number
    pageSize: number
  }
  meta: {
    range: string
    generatedAt: string
    dataPresent: boolean | Record<string, boolean>
    reason?: string
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card-bg border border-border rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-border rounded w-24 mb-2" />
            <div className="h-8 bg-border rounded w-16 mb-1" />
            <div className="h-3 bg-border rounded w-32" />
          </div>
        ))}
      </div>
      <div className="bg-card-bg border border-border rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-border rounded w-40 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 bg-border rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

function emptyPayload(range: RangeOption): AnalyticsPayload {
  return {
    unitEconomics: { byUser: [], byLeague: [], totals: { totalCost: 0, userCount: 0, leagueCount: 0 } },
    callToolCost: { calls: [], avgCallCost: 0, totalCallCost: 0 },
    toolPopularity: { byTool: [], totalToolCalls: 0 },
    intents: { byLabel: [], totalClassified: 0 },
    rawEvents: { events: [], total: 0, page: 0, pageSize: 50 },
    meta: { range, generatedAt: new Date().toISOString(), dataPresent: false },
  }
}

export function SurfballersDashboard() {
  const [range, setRange] = useState<RangeOption>('30d')
  const [activeTab, setActiveTab] = useState<ViewTab>('unit-economics')
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawPage, setRawPage] = useState(0)

  const fetchData = useCallback(async (r: RangeOption, p: number) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/surfballers/analytics?range=${r}&page=${p}`)
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json: AnalyticsPayload = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      setData(emptyPayload(r))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(range, rawPage)
  }, [fetchData, range, rawPage])

  const handleRangeChange = (r: RangeOption) => {
    setRange(r)
    setRawPage(0)
  }

  const handlePageChange = (p: number) => {
    setRawPage(p)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-current hover:opacity-70 ml-3">✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Range selector */}
        <div className="flex gap-1 bg-card-bg border border-border rounded-lg p-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleRangeChange(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === opt.value
                  ? 'bg-primary text-primary-fg'
                  : 'text-muted-fg hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {data && (
          <p className="text-xs text-muted-fg">
            Updated {new Date(data.meta.generatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.value
                  ? 'border-[#00A8E8] text-foreground'
                  : 'border-transparent text-muted-fg hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* View content */}
      {loading ? (
        <LoadingSkeleton />
      ) : data ? (
        <div>
          {activeTab === 'unit-economics' && (
            <UnitEconomicsView data={data.unitEconomics} />
          )}
          {activeTab === 'call-cost' && (
            <CallToolCostView data={data.callToolCost} />
          )}
          {activeTab === 'tool-popularity' && (
            <ToolPopularityView data={data.toolPopularity} />
          )}
          {activeTab === 'intents' && (
            <IntentExplorerView data={data.intents} />
          )}
          {activeTab === 'raw-events' && (
            <RawEventsView
              data={data.rawEvents}
              range={range}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
