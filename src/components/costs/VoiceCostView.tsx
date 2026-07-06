'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { VoiceCostRow } from '@/types/costs'

const supabase = createClient()

export function VoiceCostView() {
  const [rows, setRows] = useState<VoiceCostRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    supabase
      .from('voice_cost_monthly_by_account')
      .select('ghl_location_id,month,call_count,total_minutes,total_estimated_cost_usd,blended_cost_per_min')
      .eq('month', currentMonthStr)
      .order('total_estimated_cost_usd', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          // View absent pre-#626 merge — treat as empty, never error
          console.warn('voice_cost_monthly_by_account unavailable:', error.message)
          setRows([])
        } else {
          setRows(data || [])
        }
        setLoading(false)
      })
  }, [])

  const totals = rows.reduce(
    (acc, row) => ({
      call_count: acc.call_count + (row.call_count ?? 0),
      total_minutes: acc.total_minutes + (row.total_minutes ?? 0),
      total_estimated_cost_usd: acc.total_estimated_cost_usd + (row.total_estimated_cost_usd ?? 0),
    }),
    { call_count: 0, total_minutes: 0, total_estimated_cost_usd: 0 }
  )

  const blendedCostPerMin =
    totals.total_minutes > 0 ? totals.total_estimated_cost_usd / totals.total_minutes : null

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-border rounded w-48 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-border rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-semibold text-foreground">Voice Cost — Per Account</h2>
          <span className="text-xs text-muted-fg">
            {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <p className="text-sm text-muted-fg mb-4">
          OpenAI Realtime + Twilio attributed per customer sub-account
        </p>

        {rows.length === 0 ? (
          <div className="text-center py-8 text-muted-fg">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-sm">No voice cost data this month yet.</p>
            <p className="text-xs mt-1">Data appears once voice calls complete and #626 is merged to prod.</p>
          </div>
        ) : (
          <>
            {/* Project totals row */}
            <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-background/50 rounded-lg border border-border">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  ${totals.total_estimated_cost_usd.toFixed(2)}
                </div>
                <div className="text-xs text-muted-fg">Total This Month</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {totals.total_minutes.toFixed(1)}
                </div>
                <div className="text-xs text-muted-fg">Total Minutes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {totals.call_count.toLocaleString()}
                </div>
                <div className="text-xs text-muted-fg">Total Calls</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {blendedCostPerMin != null ? `$${blendedCostPerMin.toFixed(4)}` : '—'}
                </div>
                <div className="text-xs text-muted-fg">Blended $/min</div>
              </div>
            </div>

            {/* Per-account table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-fg text-left">
                    <th className="pb-2 pr-4 font-medium">Account ID</th>
                    <th className="pb-2 pr-4 font-medium text-right">Cost</th>
                    <th className="pb-2 pr-4 font-medium text-right">Minutes</th>
                    <th className="pb-2 pr-4 font-medium text-right">Calls</th>
                    <th className="pb-2 font-medium text-right">$/min</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.ghl_location_id} className="border-b border-border/50 hover:bg-border/20 transition-colors">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground truncate max-w-[160px]">
                        {row.ghl_location_id}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium text-foreground">
                        ${(row.total_estimated_cost_usd ?? 0).toFixed(3)}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-fg">
                        {(row.total_minutes ?? 0).toFixed(1)}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-fg">
                        {row.call_count ?? 0}
                      </td>
                      <td className="py-2 text-right text-muted-fg">
                        {row.blended_cost_per_min != null
                          ? `$${Number(row.blended_cost_per_min).toFixed(4)}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
