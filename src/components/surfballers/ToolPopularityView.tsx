'use client'

interface ToolData {
  name: string
  count: number
}

interface ToolPopularityData {
  byTool: ToolData[]
  totalToolCalls: number
}

interface ToolPopularityViewProps {
  data: ToolPopularityData
}

export function ToolPopularityView({ data }: ToolPopularityViewProps) {
  const maxCount = data.byTool[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-fg">Total Tool Calls</p>
        </div>
        <p className="text-2xl font-bold text-foreground">{data.totalToolCalls.toLocaleString()}</p>
        <p className="text-xs text-muted-fg mt-1">{data.byTool.length} distinct tool{data.byTool.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-card-bg border border-border rounded-lg p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Tool Call Ranking</h3>
        {data.byTool.length === 0 ? (
          <p className="text-muted-fg text-sm">No tool call data for this range.</p>
        ) : (
          <div className="space-y-3">
            {data.byTool.map((tool, i) => {
              const pct = maxCount > 0 ? (tool.count / maxCount) * 100 : 0
              const share = data.totalToolCalls > 0
                ? ((tool.count / data.totalToolCalls) * 100).toFixed(1)
                : '0.0'
              return (
                <div key={tool.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-fg w-5 text-right">{i + 1}.</span>
                      <span className="text-foreground font-mono">{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-fg">
                      <span>{share}%</span>
                      <span className="font-medium text-foreground">{tool.count.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: '#00A8E8' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
