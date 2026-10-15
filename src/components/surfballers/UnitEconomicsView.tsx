'use client'

interface UnitEconomicsData {
  byUser: { key: string; total_cost: number }[]
  byLeague: { key: string; total_cost: number }[]
  totals: { totalCost: number; userCount: number; leagueCount: number }
}

interface UnitEconomicsViewProps {
  data: UnitEconomicsData
}

function fmt(n: number) {
  return n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(4)}`
}

function BarList({ items, maxVal }: { items: { key: string; total_cost: number }[]; maxVal: number }) {
  if (items.length === 0) {
    return <p className="text-muted-fg text-sm">No data for this range.</p>
  }
  return (
    <div className="space-y-2">
      {items.map(item => {
        const pct = maxVal > 0 ? (item.total_cost / maxVal) * 100 : 0
        return (
          <div key={item.key} className="space-y-1">
            <div className="flex justify-between text-xs text-muted-fg">
              <span className="font-mono truncate max-w-[200px]">{item.key}</span>
              <span>{fmt(item.total_cost)}</span>
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
  )
}

export function UnitEconomicsView({ data }: UnitEconomicsViewProps) {
  const maxUser = data.byUser[0]?.total_cost ?? 0
  const maxLeague = data.byLeague[0]?.total_cost ?? 0
  const totalCalls = data.byUser.length
  const avgPerUser = totalCalls > 0 ? data.totals.totalCost / data.totals.userCount : 0

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <p className="text-sm text-muted-fg mb-2">Total Cost</p>
          <p className="text-2xl font-bold text-foreground">{fmt(data.totals.totalCost)}</p>
          <p className="text-xs text-muted-fg mt-1">across all users</p>
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <p className="text-sm text-muted-fg mb-2">Avg Cost / User</p>
          <p className="text-2xl font-bold text-foreground">{fmt(avgPerUser)}</p>
          <p className="text-xs text-muted-fg mt-1">{data.totals.userCount} active user{data.totals.userCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <p className="text-sm text-muted-fg mb-2">Leagues Tracked</p>
          <p className="text-2xl font-bold text-foreground">{data.totals.leagueCount}</p>
          <p className="text-xs text-muted-fg mt-1">with cost attribution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Cost by User</h3>
          <BarList items={data.byUser} maxVal={maxUser} />
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <h3 className="text-base font-semibold text-foreground mb-4">Cost by League</h3>
          <BarList items={data.byLeague} maxVal={maxLeague} />
        </div>
      </div>
    </div>
  )
}
