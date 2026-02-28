'use client'

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

interface HealthSummaryCardProps {
  runs: PipelineRun[]
  lastRun?: PipelineRun | null
}

export function HealthSummaryCard({ runs, lastRun }: HealthSummaryCardProps) {
  // Calculate 7-day success rate
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const recentRuns = runs.filter(run => 
    new Date(run.started_at) >= sevenDaysAgo
  )
  
  const successfulRuns = recentRuns.filter(run => 
    run.status === 'completed'
  ).length
  
  const successRate = recentRuns.length > 0 
    ? Math.round((successfulRuns / recentRuns.length) * 100) 
    : 0

  // Determine overall health status
  const getHealthStatus = () => {
    if (successRate >= 90) return { status: 'healthy', color: 'text-green-400', bg: 'bg-green-400/10' }
    if (successRate >= 70) return { status: 'warning', color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
    return { status: 'critical', color: 'text-red-400', bg: 'bg-red-400/10' }
  }

  const health = getHealthStatus()
  
  // Last healthy run
  const lastHealthyRun = runs.find(run => run.status === 'completed')
  const timeSinceLastHealthy = lastHealthyRun 
    ? getTimeAgo(new Date(lastHealthyRun.completed_at || lastHealthyRun.started_at))
    : 'Never'

  // Last run time
  const lastRunTime = lastRun 
    ? getTimeAgo(new Date(lastRun.started_at))
    : 'No runs found'

  return (
    <div className="bg-card-bg border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Pipeline Health</h2>
          <p className="text-muted-fg text-sm">Real-time status across all pipelines</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${health.bg}`}>
          <div className={`w-2 h-2 rounded-full ${health.color.replace('text-', 'bg-')}`}></div>
          <span className={`text-sm font-medium ${health.color}`}>
            {health.status === 'healthy' ? 'Healthy' : 
             health.status === 'warning' ? 'Warning' : 'Critical'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Success Rate */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm text-muted-fg">7-Day Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{successRate}%</div>
          <div className="text-xs text-muted-fg">
            {successfulRuns}/{recentRuns.length} successful runs
          </div>
        </div>

        {/* Last Run */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-muted-fg">Last Run</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{lastRunTime}</div>
          {lastRun && (
            <div className="text-xs text-muted-fg">
              {lastRun.pipeline} • {lastRun.status}
            </div>
          )}
        </div>

        {/* Last Healthy Run */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-muted-fg">Last Healthy Run</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{timeSinceLastHealthy}</div>
          {lastHealthyRun && (
            <div className="text-xs text-muted-fg">
              {lastHealthyRun.pipeline}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (hours < 1) {
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else {
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }
}