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
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [latestEntries, setLatestEntries] = useState<Record<string, AdminApiCost>>({})

  const fetchCosts = useCallback(async () => {
    try {
      setLoading(true)
      
      const now = new Date()
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      
      const [costsResult, latestResult] = await Promise.all([
        supabase
          .from('admin_api_costs')
          .select('*')
          .gte('date', startOfLastMonth)
          .order('date', { ascending: true }),
        // Fetch ALL entries (not just this/last month) to find true latest per provider
        supabase
          .from('admin_api_costs')
          .select('*')
          .eq('app', 'empire')
          .order('created_at', { ascending: false })
          .limit(200)
      ])
      
      if (costsResult.error) throw costsResult.error
      
      setCosts(costsResult.data || [])

      // Build latest entry per provider
      const latest: Record<string, AdminApiCost> = {}
      for (const entry of (latestResult.data || [])) {
        if (!latest[entry.provider]) {
          latest[entry.provider] = entry
        }
      }
      setLatestEntries(latest)
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

  const handleSync = async () => {
    try {
      setSyncing(true)
      setSyncMessage(null)
      const res = await fetch('/api/costs/trigger-sync', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Sync failed (${res.status})`)
      }
      const data = await res.json()
      const results = data.results as { provider: string; status: string; error?: string }[]
      const ok = results.filter(r => r.status === 'ok').map(r => r.provider)
      const skipped = results.filter(r => r.status === 'skipped').map(r => r.provider)
      const failed = results.filter(r => r.status === 'error')
      
      const parts: string[] = []
      if (ok.length) parts.push(`✅ Synced: ${ok.join(', ')}`)
      if (skipped.length) parts.push(`⏭️ Skipped: ${skipped.join(', ')}`)
      if (failed.length) parts.push(`❌ Failed: ${failed.map(f => `${f.provider} (${f.error})`).join(', ')}`)
      
      setSyncMessage({ type: failed.length && !ok.length ? 'error' : 'success', text: parts.join(' · ') })
      await fetchCosts()
    } catch (err) {
      setSyncMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

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
      
      {/* Sync result banner */}
      {syncMessage && (
        <div className={`${syncMessage.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'} border px-4 py-3 rounded-lg flex items-center justify-between`}>
          <span className="text-sm">{syncMessage.text}</span>
          <button onClick={() => setSyncMessage(null)} className="text-current hover:opacity-70 ml-3">✕</button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
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
              latestEntry={latestEntries[stats.provider]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
