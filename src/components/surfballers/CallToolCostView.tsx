'use client'

interface CallData {
  key: string
  total_cost: number
  window_start: string
}

interface CallToolCostData {
  calls: CallData[]
  avgCallCost: number
  totalCallCost: number
}

interface CallToolCostViewProps {
  data: CallToolCostData
}

function fmt(n: number) {
  return n < 0.001 ? `$${n.toFixed(6)}` : `$${n.toFixed(4)}`
}

export function CallToolCostView({ data }: CallToolCostViewProps) {
  const maxCost = data.calls[0]?.total_cost ?? 0

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <p className="text-sm text-muted-fg mb-2">Total Call Cost</p>
          <p className="text-2xl font-bold text-foreground">{fmt(data.totalCallCost)}</p>
          <p className="text-xs text-muted-fg mt-1">{data.calls.length} calls logged</p>
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <p className="text-sm text-muted-fg mb-2">Avg Cost / Call</p>
          <p className="text-2xl font-bold text-foreground">{fmt(data.avgCallCost)}</p>
          <p className="text-xs text-muted-fg mt-1">per assistant call</p>
        </div>
      </div>

      {/* Per-call distribution */}
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Per-Call Cost Distribution</h3>
        {data.calls.length === 0 ? (
          <p className="text-muted-fg text-sm">No call cost data for this range.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.calls.slice(0, 50).map((call, i) => {
              const pct = maxCost > 0 ? (call.total_cost / maxCost) * 100 : 0
              return (
                <div key={`${call.key}-${i}`} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-fg">
                    <span className="font-mono truncate max-w-[200px]">{call.key}</span>
                    <span>{fmt(call.total_cost)}</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: '#00A8E8' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Note: per-tool cost not available */}
      <div className="bg-card-bg border border-border rounded-lg p-4">
        <p className="text-xs text-muted-fg">
          <span className="font-medium text-foreground">Note:</span> Per-tool cost breakdown is not available — LLM token costs are not scoped to individual tool invocations in the rollup data. See Tool Popularity for per-tool call counts.
        </p>
      </div>
    </div>
  )
}
