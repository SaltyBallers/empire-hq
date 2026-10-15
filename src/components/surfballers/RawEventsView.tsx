'use client'

interface RawEvent {
  id: string
  created_at: string
  event: string
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  latency_ms: number | null
  status: string | null
  tool_name: string | null
  prompt_truncated: string | null
  user_id: string
}

interface RawEventsData {
  events: RawEvent[]
  total: number
  page: number
  pageSize: number
}

interface RawEventsViewProps {
  data: RawEventsData
  range: string
  onPageChange: (page: number) => void
}

export function RawEventsView({ data, onPageChange }: RawEventsViewProps) {
  const { events, page, pageSize } = data
  const hasNext = events.length === pageSize
  const hasPrev = page > 0

  return (
    <div className="space-y-4">
      <div className="bg-card-bg border border-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Raw Events</h3>
          <span className="text-xs text-muted-fg">Page {page + 1} · {pageSize} per page</span>
        </div>

        {events.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-fg text-sm">
            No events for this range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">Time</th>
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">User</th>
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">Model</th>
                  <th className="px-4 py-3 text-right text-muted-fg font-medium">Tokens</th>
                  <th className="px-4 py-3 text-right text-muted-fg font-medium">Latency</th>
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">Tool</th>
                  <th className="px-4 py-3 text-left text-muted-fg font-medium">Prompt (truncated)</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-background transition-colors">
                    <td className="px-4 py-3 text-muted-fg whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${ev.event === 'tool_call' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {ev.event}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-fg">
                      {ev.user_id ? ev.user_id.slice(0, 12) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-fg">{ev.model ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-muted-fg">{ev.total_tokens?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-muted-fg">{ev.latency_ms != null ? `${ev.latency_ms}ms` : '—'}</td>
                    <td className="px-4 py-3">
                      {ev.status ? (
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${ev.status === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {ev.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-fg font-mono">{ev.tool_name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-fg max-w-xs">
                      {ev.prompt_truncated ? (
                        <span className="truncate block" title={ev.prompt_truncated}>
                          {ev.prompt_truncated}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(hasPrev || hasNext) && (
          <div className="px-6 py-3 border-t border-border flex items-center justify-between">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrev}
              className="px-3 py-1.5 text-xs font-medium text-muted-fg hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNext}
              className="px-3 py-1.5 text-xs font-medium text-muted-fg hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
