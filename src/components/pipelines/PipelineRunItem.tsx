'use client'

import { useState } from 'react'
import type { PipelineRun } from '@/types/pipeline'

interface PipelineRunItemProps {
  run: PipelineRun
}

export function PipelineRunItem({ run }: PipelineRunItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          color: 'text-green-400',
          bg: 'bg-green-400/10',
          border: 'border-green-400/20',
          icon: '🟢',
          label: 'Completed'
        }
      case 'partial':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10',
          border: 'border-yellow-400/20',
          icon: '🟡',
          label: 'Partial'
        }
      case 'running':
        return {
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10',
          border: 'border-yellow-400/20',
          icon: '🟡',
          label: 'Running'
        }
      case 'failed':
        return {
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-400/20',
          icon: '🔴',
          label: 'Failed'
        }
      default:
        return {
          color: 'text-muted-fg',
          bg: 'bg-muted/10',
          border: 'border-border',
          icon: '⚪',
          label: 'Unknown'
        }
    }
  }

  const statusConfig = getStatusConfig(run.status)

  const formatDuration = (durationMs: number | null): string => {
    if (!durationMs) return 'N/A'
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const renderStatsBreakdown = () => {
    if (!run.stats || typeof run.stats !== 'object') {
      return <p className="text-muted-fg text-sm">No stats available</p>
    }

    const stats = Object.entries(run.stats)
    
    if (stats.length === 0) {
      return <p className="text-muted-fg text-sm">No stats available</p>
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {stats.map(([key, value]) => (
          <div key={key} className="bg-background/50 rounded-lg p-3">
            <div className="text-sm text-muted-fg">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            <div className="text-lg font-semibold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : String(value)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`bg-card-bg border rounded-lg transition-all duration-200 hover:bg-card-bg/80 ${statusConfig.border}`}>
      {/* Main Card Content */}
      <button 
        type="button"
        className="p-4 cursor-pointer w-full text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={`${run.pipeline} — ${statusConfig.label}. Click to ${isExpanded ? 'collapse' : 'expand'} details.`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Pipeline Name */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {run.pipeline.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-fg">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDuration(run.duration_ms)}
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0V7a2 2 0 00-2 2v8m0 0V7a2 2 0 002-2v0a2 2 0 002-2" />
                </svg>
                {run.started_at ? formatTimestamp(run.started_at) : 'N/A'}
              </div>
            </div>

            {/* Error Preview */}
            {run.error_details && (run.status === 'failed' || run.status === 'partial') && (
              <div className="mt-3 p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-5.898 6.5C4.372 11.833 5.334 13.5 6.874 13.5z" />
                  </svg>
                  <p className="text-red-300 text-sm line-clamp-2">
                    {run.error_details}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expand Icon */}
          <div className="ml-4 flex-shrink-0">
            <svg 
              className={`w-5 h-5 text-muted-fg transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-6">
          {/* Run Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-fg mb-1">Started At</div>
              <div className="text-sm text-foreground">
                {run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-fg mb-1">Completed At</div>
              <div className="text-sm text-foreground">
                {run.completed_at ? new Date(run.completed_at).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-fg mb-1">Duration</div>
              <div className="text-sm text-foreground">
                {formatDuration(run.duration_ms)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-fg mb-1">Run ID</div>
              <div className="text-sm text-foreground font-mono">
                {run.id.slice(0, 8)}...
              </div>
            </div>
          </div>

          {/* Stats Breakdown */}
          {run.stats && (
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-3">Stats Breakdown</h4>
              {renderStatsBreakdown()}
            </div>
          )}

          {/* Full Error Details */}
          {run.error_details && (run.status === 'failed' || run.status === 'partial') && (
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-3">Error Details</h4>
              <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4">
                <pre className="text-red-300 text-sm whitespace-pre-wrap font-mono">
                  {run.error_details}
                </pre>
              </div>
            </div>
          )}

          {/* Raw Stats JSON (for debugging) */}
          {run.stats && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-fg hover:text-foreground">
                View Raw Stats JSON
              </summary>
              <div className="mt-2 bg-background/50 rounded-lg p-4">
                <pre className="text-xs text-muted-fg font-mono whitespace-pre-wrap">
                  {JSON.stringify(run.stats, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}