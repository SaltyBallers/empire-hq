'use client'

import { useMemo } from 'react'
import type { DailyCost } from '@/types/costs'

interface MonthlyChartProps {
  dailyCosts: DailyCost[]
}

const PROVIDER_COLORS = {
  apify: '#0ea5e9', // sky-500
  openai: '#10b981', // emerald-500
  vercel: '#8b5cf6', // violet-500
  supabase: '#f59e0b'  // amber-500
} as const

export function MonthlyChart({ dailyCosts }: MonthlyChartProps) {
  const { chartData, maxDaily, totalDays } = useMemo(() => {
    const maxDaily = Math.max(...dailyCosts.map(d => d.total), 1)
    
    // Fill in missing days with zero costs
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const today = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currentDay = today.getDate()
    
    const filledData: DailyCost[] = []
    
    for (let day = 1; day <= Math.min(currentDay, daysInMonth); day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day).toISOString().split('T')[0]
      const existingData = dailyCosts.find(d => d.date === date)
      
      if (existingData) {
        filledData.push(existingData)
      } else {
        filledData.push({
          date,
          providers: {},
          total: 0
        })
      }
    }
    
    return {
      chartData: filledData,
      maxDaily,
      totalDays: filledData.length
    }
  }, [dailyCosts])

  if (chartData.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Monthly Cost Trend</h2>
        <div className="text-center py-12 text-muted-fg">
          No daily cost data available for this month
        </div>
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
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(PROVIDER_COLORS).map(([provider, color]) => (
            <div key={provider} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-muted-fg capitalize">{provider}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-3">
        {/* Y-axis labels */}
        <div className="flex justify-between text-xs text-muted-fg mb-2">
          <span>$0</span>
          <span>${(maxDaily / 2).toFixed(2)}</span>
          <span>${maxDaily.toFixed(2)}</span>
        </div>
        
        {/* Chart bars */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${totalDays}, 1fr)` }}>
          {chartData.map((dayData) => {
            const day = new Date(dayData.date).getDate()
            const heightPercent = maxDaily > 0 ? (dayData.total / maxDaily) * 100 : 0
            
            return (
              <div key={dayData.date} className="flex flex-col items-center group">
                {/* Bar */}
                <div 
                  className="w-full min-h-[2px] bg-border rounded-t flex flex-col-reverse relative"
                  style={{ height: '120px' }}
                >
                  {/* Stacked segments for each provider */}
                  {Object.entries(dayData.providers).length > 0 && (
                    <div 
                      className="w-full rounded flex flex-col-reverse"
                      style={{ height: `${heightPercent}%` }}
                    >
                      {Object.entries(dayData.providers).map(([provider, cost]) => {
                        const segmentHeight = dayData.total > 0 ? (cost / dayData.total) * 100 : 0
                        return (
                          <div
                            key={provider}
                            className="w-full"
                            style={{ 
                              height: `${segmentHeight}%`,
                              backgroundColor: PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS]
                            }}
                          />
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Tooltip on hover */}
                  {dayData.total > 0 && (
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                      <div className="text-foreground font-medium">${dayData.total.toFixed(2)}</div>
                      {Object.entries(dayData.providers).map(([provider, cost]) => (
                        <div key={provider} className="text-muted-fg">
                          {provider}: ${cost.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Day label */}
                <div className="text-xs text-muted-fg mt-1">
                  {day}
                </div>
              </div>
            )
          })}
        </div>
        
        {/* X-axis label */}
        <div className="text-center text-xs text-muted-fg mt-2">
          Days of {new Date().toLocaleDateString('en', { month: 'long' })}
        </div>
      </div>
    </div>
  )
}