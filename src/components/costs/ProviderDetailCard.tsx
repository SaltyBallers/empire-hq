'use client'

import { useState } from 'react'
import type { ProviderStats } from '@/types/costs'

interface ProviderDetailCardProps {
  stats: ProviderStats
  budget: number
}

export function ProviderDetailCard({ stats, budget }: ProviderDetailCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const budgetPercentage = (stats.totalSpend / budget) * 100
  const budgetStatus = budgetPercentage >= 75 ? 'red' : budgetPercentage >= 50 ? 'yellow' : 'green'
  
  const statusColors = {
    green: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/20' },
    yellow: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/20' },
    red: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' }
  }
  
  const colors = statusColors[budgetStatus]
  
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) {
      return `${minutes}m ago`
    } else if (hours < 24) {
      return `${hours}h ago`
    } else {
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    }
  }

  return (
    <div className={`bg-card-bg border ${colors.border} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${colors.text.replace('text-', 'bg-')}`}></div>
            <h3 className="text-lg font-semibold text-foreground capitalize">{stats.provider}</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="p-2 hover:bg-border rounded-md transition-colors"
          >
            <svg 
              className={`w-5 h-5 text-muted-fg transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-foreground">${stats.totalSpend.toFixed(2)}</div>
            <div className="text-sm text-muted-fg">Total This Month</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.apiCalls}</div>
            <div className="text-sm text-muted-fg">API Calls</div>
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
          {/* Average Cost Per Call */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-muted-fg">Average Cost Per Call</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              ${stats.averageCostPerCall.toFixed(4)}
            </span>
          </div>

          {/* Last Entry */}
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
                
                {/* Metadata if available */}
                {stats.lastEntry.metadata && Object.keys(stats.lastEntry.metadata).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-xs text-muted-fg">
                      {Object.entries(stats.lastEntry.metadata)
                        .slice(0, 2) // Show only first 2 metadata items
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

          {/* No data state */}
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