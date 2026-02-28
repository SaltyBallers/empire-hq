export interface PipelineRun {
  id: string
  pipeline: string
  status: 'completed' | 'partial' | 'failed' | 'running'
  stats: Record<string, unknown> | null
  error_details: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  created_at: string
}
