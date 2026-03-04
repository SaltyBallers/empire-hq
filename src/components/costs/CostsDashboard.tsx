'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { AdminApiCost, CostSummary, ProviderStats, DailyCost } from '@/types/costs'
import { ALL_PROVIDERS, MONTHLY_BUDGETS } from '@/types/costs'
import { CostSummaryCards } from './CostSummaryCards'
import { MonthlyChart } from './MonthlyChart'
import { ProviderDetailCard } from './ProviderDetailCard'
import { ManualCostEntry } from './ManualCostEntry'

const supabase = createClient()

export function CostsDashboard() {
  const [costs, setCosts] = useState<AdminApiCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true)
      
      const now = new Date()
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCosts()
  }, [fetchCosts])

  // Get unique providers that have data
  const activeProviders = useMemo(() => {
    const providersWithData = new Set(costs.map(c => c.provider))
    // Show all known providers, but sort active ones first
    return ALL_PROVIDERS.slice().sort((a, b) => {
      const aActive = providersWithData.has(a) ? 0 : 1
      const bActive = providersWithData.has(b) ? 0 : 1
      return aActive - bActive
    })
  }, [costs])

  const { costSummary, dailyCosts, providerStats } = useMemo(() => {
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    
    const thisMonthCosts = costs.filter(cost => new Date(cost.date) >= startOfThisMonth)
    const lastMonthCosts = costs.filter(cost => 
      new Date(cost.date) >= startOfLastMonth && new Date(cost.date) <= endOfLastMonth
    )
    
    const totalThisMonth = thisMonthCosts.reduce((sum, cost) => sum + Number(cost.value), 0)
    const totalLastMonth = lastMonthCosts.reduce((sum, cost) => sum + Number(cost.value), 0)
    const deltaPercent = totalLastMonth > 0 
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 
      : 0
    
    const providerBreakdown = activeProviders.reduce((acc, provider) => {
      const amount = thisMonthCosts
        .filter(cost => cost.provider === provider)
        .reduce((sum, cost) => sum + Number(cost.value), 0)
      if (amount > 0) acc[provider] = amount
      return acc
    }, {} as Record<string, number>)

    const summary: CostSummary = {
      totalThisMonth,
      totalLastMonth,
      deltaPercent,
      providerBreakdown
    }
    
    // Daily costs for chart
    const dailyCostMap = new Map<string, Record<string, number>>()
    thisMonthCosts.forEach(cost => {
      const date = cost.date
      if (!dailyCostMap.has(date)) dailyCostMap.set(date, {})
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
    
    // Provider stats
    const providerStats: ProviderStats[] = activeProviders.map(provider => {
      const providerCosts = thisMonthCosts.filter(cost => cost.provider === provider)
      const totalSpend = providerCosts.reduce((sum, cost) => sum + Number(cost.value), 0)
      const apiCalls = providerCosts.length
      const averageCostPerCall = apiCalls > 0 ? totalSpend / apiCalls : 0
      const lastEntry = providerCosts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      
      return { provider, totalSpend, apiCalls, averageCostPerCall, lastEntry }
    })
    
    return { costSummary: summary, dailyCosts, providerStats }
  }, [costs, activeProviders])

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
      
      {/* Action bar */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Log Cost
        </button>
      </div>

      {showManualEntry && (
        <ManualCostEntry onSuccess={() => { setShowManualEntry(false); fetchCosts() }} onCancel={() => setShowManualEntry(false)} />
      )}
      
      <CostSummaryCards summary={costSummary} budgets={MONTHLY_BUDGETS} />
      
      <MonthlyChart dailyCosts={dailyCosts} />
      
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Provider Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providerStats.map(stats => (
            <ProviderDetailCard 
              key={stats.provider} 
              stats={stats} 
              budget={MONTHLY_BUDGETS[stats.provider] || 100}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
