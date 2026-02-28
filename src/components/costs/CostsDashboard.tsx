'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { AdminApiCost, CostSummary, ProviderStats, DailyCost } from '@/types/costs'
import { CostSummaryCards } from './CostSummaryCards'
import { MonthlyChart } from './MonthlyChart'
import { ProviderDetailCard } from './ProviderDetailCard'

const supabase = createClient()

const PROVIDERS = ['apify', 'openai', 'vercel', 'supabase'] as const

// Monthly budget limits (in USD)
const MONTHLY_BUDGETS: Record<string, number> = {
  apify: 100,
  openai: 200,
  vercel: 50,
  supabase: 75
}

export function CostsDashboard() {
  const [costs, setCosts] = useState<AdminApiCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get costs for current month and last month
      const now = new Date()
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      
      const { data, error: fetchError } = await supabase
        .from('admin_api_costs')
        .select('*')
        .gte('date', startOfLastMonth)
        .order('date', { ascending: true })
      
      if (fetchError) throw fetchError
      
      setCosts(data || [])
    } catch (err) {
      console.error('Error fetching costs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch costs')
      // Preserve stale data on error
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch costs on mount
  useEffect(() => {
    fetchCosts()
  }, [fetchCosts])

  const { costSummary, dailyCosts, providerStats } = useMemo(() => {
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    // Separate this month vs last month costs
    const thisMonthCosts = costs.filter(cost => 
      new Date(cost.date) >= startOfThisMonth
    )
    const lastMonthCosts = costs.filter(cost => 
      new Date(cost.date) >= startOfLastMonth && new Date(cost.date) <= endOfLastMonth
    )
    
    // Calculate cost summary
    const totalThisMonth = thisMonthCosts.reduce((sum, cost) => sum + Number(cost.value), 0)
    const totalLastMonth = lastMonthCosts.reduce((sum, cost) => sum + Number(cost.value), 0)
    const deltaPercent = totalLastMonth > 0 
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 
      : 0
    
    const providerBreakdown = PROVIDERS.reduce((acc, provider) => {
      acc[provider] = thisMonthCosts
        .filter(cost => cost.provider === provider)
        .reduce((sum, cost) => sum + Number(cost.value), 0)
      return acc
    }, {} as Record<string, number>)

    const summary: CostSummary = {
      totalThisMonth,
      totalLastMonth,
      deltaPercent,
      providerBreakdown
    }
    
    // Calculate daily costs for chart
    const dailyCostMap = new Map<string, Record<string, number>>()
    
    thisMonthCosts.forEach(cost => {
      const date = cost.date
      if (!dailyCostMap.has(date)) {
        dailyCostMap.set(date, {})
      }
      const dayData = dailyCostMap.get(date)!
      dayData[cost.provider] = (dayData[cost.provider] || 0) + Number(cost.value)
    })
    
    const dailyCosts: DailyCost[] = Array.from(dailyCostMap.entries())
      .map(([date, providers]) => ({
        date,
        providers,
        total: Object.values(providers).reduce((sum, cost) => sum + cost, 0)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // Calculate provider stats
    const providerStats: ProviderStats[] = PROVIDERS.map(provider => {
      const providerCosts = thisMonthCosts.filter(cost => cost.provider === provider)
      const totalSpend = providerCosts.reduce((sum, cost) => sum + Number(cost.value), 0)
      const apiCalls = providerCosts.length
      const averageCostPerCall = apiCalls > 0 ? totalSpend / apiCalls : 0
      const lastEntry = providerCosts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      
      return {
        provider,
        totalSpend,
        apiCalls,
        averageCostPerCall,
        lastEntry
      }
    })
    
    return { costSummary: summary, dailyCosts, providerStats }
  }, [costs])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card-bg border border-border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-border rounded w-20 mb-2"></div>
              <div className="h-8 bg-border rounded w-16 mb-1"></div>
              <div className="h-3 bg-border rounded w-24"></div>
            </div>
          ))}
        </div>
        <div className="bg-card-bg border border-border rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-border rounded w-32 mb-6"></div>
          <div className="h-40 bg-border rounded"></div>
        </div>
      </div>
    )
  }

  if (costs.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-lg p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-4">No Cost Data</h2>
          
          <p className="text-muted-fg mb-6">
            No API costs have been logged yet. Once your services start generating costs,
            they'll appear here automatically.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          Failed to fetch latest data: {error}
        </div>
      )}
      
      <CostSummaryCards summary={costSummary} budgets={MONTHLY_BUDGETS} />
      
      <MonthlyChart dailyCosts={dailyCosts} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providerStats.map(stats => (
          <ProviderDetailCard 
            key={stats.provider} 
            stats={stats} 
            budget={MONTHLY_BUDGETS[stats.provider] || 100}
          />
        ))}
      </div>
    </div>
  )
}