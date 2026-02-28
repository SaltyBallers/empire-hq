'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { HealthSummaryCard } from './HealthSummaryCard'
import { PipelineRunItem } from './PipelineRunItem'

interface PipelineRun {
  id: string
  pipeline: string
  status: 'completed' | 'partial' | 'failed' | 'running'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  error_details: string | null
  stats: Record<string, any> | null
  created_at: string
}

export function PipelineDashboard() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const supabase = createClient()

  const fetchPipelineRuns = useCallback(async () => {
    try {
      setError(null)
      
      const { data, error: fetchError } = await supabase
        .from('pipeline_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20)

      if (fetchError) {
        throw fetchError
      }

      setRuns(data || [])
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error fetching pipeline runs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch pipeline runs')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Initial load
  useEffect(() => {
    fetchPipelineRuns()
  }, [fetchPipelineRuns])

  // Auto-refresh every 30s when enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchPipelineRuns()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, fetchPipelineRuns])

  const handleRefresh = async () => {
    setLoading(true)
    await fetchPipelineRuns()
  }

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh)
  }

  const lastRun = runs.length > 0 ? runs[0] : null

  if (loading && runs.length === 0) {
    return (
      <div className="space-y-6">
        {/* Loading State */}
        <div className="bg-card-bg border border-border rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted/20 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 bg-muted/20 rounded w-2/3"></div>
                  <div className="h-8 bg-muted/20 rounded w-1/2"></div>
                  <div className="h-3 bg-muted/20 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Pipeline Runs */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card-bg border border-border rounded-lg p-4">
              <div className="animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-6 bg-muted/20 rounded w-1/3"></div>
                      <div className="h-6 bg-muted/20 rounded-full w-20"></div>
                    </div>
                    <div className="flex gap-4">
                      <div className="h-4 bg-muted/20 rounded w-16"></div>
                      <div className="h-4 bg-muted/20 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-5 bg-muted/20 rounded w-5"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Error State */}
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-5.898 6.5C4.372 11.833 5.334 13.5 6.874 13.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to Load Pipeline Data</h3>
              <p className="text-red-200 text-sm mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-fg rounded-lg text-sm font-medium transition-colors"
          >
            <svg 
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

          <div className="text-sm text-muted-fg">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoRefreshToggle}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-green-400/10 text-green-400 border border-green-400/20' 
                : 'bg-card-bg text-muted-fg border border-border hover:text-foreground'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400' : 'bg-muted'}`}></div>
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Health Summary */}
      <HealthSummaryCard runs={runs} lastRun={lastRun} />

      {/* Pipeline Runs List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Recent Pipeline Runs</h2>
          <div className="text-sm text-muted-fg">
            Showing {runs.length} most recent runs
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="bg-card-bg border border-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2">No Pipeline Runs Found</h3>
              
              <p className="text-muted-fg mb-6">
                There are no pipeline runs available. They will appear here once pipelines start executing.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <PipelineRunItem key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}