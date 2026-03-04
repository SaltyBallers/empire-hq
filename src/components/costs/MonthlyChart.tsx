'use client'

import { useMemo } from 'react'
import type { DailyCost } from '@/types/costs'
import { PROVIDER_CONFIG } from '@/types/costs'

interface MonthlyChartProps {
  dailyCosts: DailyCost[]
}

function getProviderColor(provider: string): string {
  return PROVIDER_CONFIG[provider]?.color || '#64748b'
}

export function MonthlyChart({ dailyCosts }: MonthlyChartProps) {
  const { chartData, maxDaily, totalDays, activeProviders } = useMemo(() => {
    const maxDaily = Math.max(...dailyCosts.map(d => d.total), 1)
    
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = now.getDate()
    
    const filledData: DailyCost[] = []
    for (let day = 1; day <= Math.min(currentDay, daysInMonth); day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day).toISOString().split('T')[0]
      const existingData = dailyCosts.find(d => d.date === date)
      filledData.push(existingData || { date, providers: {}, total: 0 })
    }
    
    // Collect unique providers from data
    const activeProviders = new Set<string>()
    dailyCosts.forEach(d => Object.keys(d.providers).forEach(p => activeProviders.add(p)))
    
    return { chartData: filledData, maxDaily, totalDays: filledData.length, activeProviders: Array.from(activeProviders) }
  }, [dailyCosts])

  if (chartData.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Monthly Cost Trend</h2>
        <div className="text-center py-12 text-muted-fg">No daily cost data available for this month</div>
      </div>
    )
  }

  return (
    <div className="bg-card-bg border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Monthly Cost Trend</h2>
          <p className="text-muted-fg text-sm">Daily spend breakdown by provider</p>
        </div>
        
        <div className="flex flex-wrap gap-3 text-sm">
          {activeProviders.map(provider => (
            <div key={provider} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getProviderColor(provider) }}></div>
              <span className="text-muted-fg">{PROVIDER_CONFIG[provider]?.label || provider}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-xs text-muted-fg mb-2">
          <span>$0</span>
          <span>${(maxDaily / 2).toFixed(2)}</span>
          <span>${maxDaily.toFixed(2)}</span>
        </div>
        
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}>
          {chartData.map((dayData) => {
            const day = new Date(dayData.date).getDate()
            const heightPercent = maxDaily > 0 ? (dayData.total / maxDaily) * 100 : 0
            
            return (
              <div key={dayData.date} className="flex flex-col items-center group">
                <div className="w-full min-h-[2px] bg-border rounded-t flex flex-col-reverse relative" style={{ height: '120px' }}>
                  {Object.entries(dayData.providers).length > 0 && (
                    <div className="w-full rounded flex flex-col-reverse" style={{ height: `${heightPercent}%` }}>
                      {Object.entries(dayData.providers).map(([provider, cost]) => {
                        const segmentHeight = dayData.total > 0 ? (cost / dayData.total) * 100 : 0
                        return (
                          <div key={provider} className="w-full" style={{ height: `${segmentHeight}%`, backgroundColor: getProviderColor(provider) }} />
                        )
                      })}
                    </div>
                  )}
                  
                  {dayData.total > 0 && (
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                      <div className="text-foreground font-medium">${dayData.total.toFixed(2)}</div>
                      {Object.entries(dayData.providers).map(([provider, cost]) => (
                        <div key={provider} className="text-muted-fg">{PROVIDER_CONFIG[provider]?.label || provider}: ${cost.toFixed(2)}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-fg mt-1">{day}</div>
              </div>
            )
          })}
        </div>
        
        <div className="text-center text-xs text-muted-fg mt-2">
          Days of {new Date().toLocaleDateString('en', { month: 'long' })}
        </div>
      </div>
    </div>
  )
}
