'use client'

import { useState } from 'react'
import type { AdminApiCost, ProviderStats } from '@/types/costs'
import { PROVIDER_CONFIG } from '@/types/costs'

interface ProviderDetailCardProps {
  stats: ProviderStats
  budget: number
  latestEntry?: AdminApiCost
}

export function ProviderDetailCard({ stats, budget, latestEntry }: ProviderDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const config = PROVIDER_CONFIG[stats.provider]
  const budgetPercentage = (stats.totalSpend / budget) * 100
  const budgetStatus = budgetPercentage >= 75 ? 'red' : budgetPercentage >= 50 ? 'yellow' : 'green'
  
  const statusColors = {
    green: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/20' },
    yellow: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/20' },
    red: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' }
  }
  
  const colors = statusColors[budgetStatus]

  // Stale calculation based on latestEntry
  const staleness = (() => {
    if (!latestEntry) return { status: 'none' as const, label: 'No data — sync or enter manually' }
    const diffMs = Date.now() - new Date(latestEntry.created_at).getTime()
    const days = diffMs / (1000 * 60 * 60 * 24)
    if (days > 14) return { status: 'red' as const, label: formatTimeAgo(latestEntry.created_at) }
    if (days > 7) return { status: 'yellow' as const, label: formatTimeAgo(latestEntry.created_at) }
    return { status: 'fresh' as const, label: formatTimeAgo(latestEntry.created_at) }
  })()

  // Low balance for balance-metric entries
  const balanceInfo = (() => {
    if (!latestEntry || latestEntry.metric !== 'balance') return null
    const bal = Number(latestEntry.value)
    const color = bal > 10 ? 'green' : bal >= 1 ? 'yellow' : 'red'
    return { value: bal, color }
  })()
  
  function formatTimeAgo(dateString: string): string {
    const diff = Date.now() - new Date(dateString).getTime()
    if (diff < 60000) return 'Just now'
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className={`bg-card-bg border ${colors.border} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${colors.text.replace('text-', 'bg-')}`}></div>
            <h3 className="text-lg font-semibold text-foreground">{config?.label || stats.provider}</h3>
            {/* Dashboard link */}
            {config?.dashboardUrl && (
              <a
                href={config.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-fg hover:text-foreground transition-colors"
                title={`Open ${config.label} billing dashboard`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="p-2 hover:bg-border rounded-md transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-muted-fg transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Last Updated + Stale Badge */}
        <div className="flex items-center gap-2 mb-4 text-xs">
          {staleness.status === 'none' ? (
            <span className="text-muted-fg italic">{staleness.label}</span>
          ) : (
            <>
              <span className="text-muted-fg">Last updated: {staleness.label}</span>
              {staleness.status === 'yellow' && <span className="px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 font-medium">🟡 Stale</span>}
              {staleness.status === 'red' && <span className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 font-medium">🔴 Stale</span>}
            </>
          )}
        </div>

        {/* Low Balance Badge */}
        {balanceInfo && (
          <div className="mb-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              balanceInfo.color === 'green' ? 'bg-green-400/10 text-green-400' :
              balanceInfo.color === 'yellow' ? 'bg-yellow-400/10 text-yellow-400' :
              'bg-red-400/10 text-red-400'
            }`}>
              <span className="text-lg font-bold">${balanceInfo.value.toFixed(2)}</span>
              <span className="text-xs">balance</span>
              {balanceInfo.color !== 'green' && <span className="text-xs font-medium">⚠️ Low Balance</span>}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-foreground">${stats.totalSpend.toFixed(2)}</div>
            <div className="text-sm text-muted-fg">Total This Month</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.apiCalls}</div>
            <div className="text-sm text-muted-fg">Entries</div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className={`${colors.text}`}>
              {budgetPercentage.toFixed(0)}% of budget
            </span>
            <span className="text-muted-fg">${budget}/mo</span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${colors.text.replace('text-', 'bg-')}`}
              style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border p-6 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-muted-fg">Average Cost Per Entry</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              ${stats.averageCostPerCall.toFixed(4)}
            </span>
          </div>

          {stats.lastEntry && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-muted-fg">Last Logged Cost</span>
              </div>
              
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      ${Number(stats.lastEntry.value).toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-fg">
                      {stats.lastEntry.metric}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-fg">
                      {formatTimeAgo(stats.lastEntry.created_at)}
                    </div>
                    <div className="text-xs text-muted-fg">
                      {new Date(stats.lastEntry.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {stats.lastEntry.metadata && Object.keys(stats.lastEntry.metadata).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-xs text-muted-fg">
                      {Object.entries(stats.lastEntry.metadata)
                        .slice(0, 2)
                        .map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="font-mono">
                              {typeof value === 'object' ? JSON.stringify(value).substring(0, 20) + '...' : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!stats.lastEntry && stats.totalSpend === 0 && (
            <div className="text-center py-4">
              <div className="text-sm text-muted-fg">No cost entries logged yet</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
