'use client'

import { useState } from 'react'

interface IntentLabel {
  label: string
  count: number
  samples?: { prompt_truncated: string; user_id: string }[]
}

interface IntentData {
  byLabel: IntentLabel[]
  totalClassified: number
}

interface IntentExplorerViewProps {
  data: IntentData
}

const INTENT_COLORS: Record<string, string> = {
  'lineup-advice':  '#00A8E8',
  'waiver-research': '#0ea5e9',
  'trade-eval':     '#38bdf8',
  'league-history': '#7dd3fc',
  'rivalries':      '#a78bfa',
  'player-lookup':  '#f472b6',
  'rules-howto':    '#34d399',
  'off-topic':      '#94a3b8',
}

function intentColor(label: string): string {
  return INTENT_COLORS[label] ?? '#64748b'
}

export function IntentExplorerView({ data }: IntentExplorerViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const maxCount = data.byLabel[0]?.count ?? 0

  return (
    <div className="space-y-6">
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Intent Distribution</h3>
          <span className="text-sm text-muted-fg">{data.totalClassified.toLocaleString()} classified</span>
        </div>

        {data.byLabel.length === 0 ? (
          <p className="text-muted-fg text-sm">No intent data for this range.</p>
        ) : (
          <div className="space-y-3">
            {data.byLabel.map(item => {
              const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0
              const share = data.totalClassified > 0
                ? ((item.count / data.totalClassified) * 100).toFixed(1)
                : '0.0'
              const isOpen = expanded === item.label

              return (
                <div key={item.label}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.label)}
                    className="w-full text-left space-y-1 group"
                  >
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: intentColor(item.label) }}
                        />
                        <span className="text-foreground">{item.label}</span>
                        <svg
                          className={`w-3.5 h-3.5 text-muted-fg transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-fg">
                        <span>{share}%</span>
                        <span className="font-medium text-foreground">{item.count.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="w-full bg-border rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: intentColor(item.label) }}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-2 ml-4 p-3 bg-background border border-border rounded-md text-xs text-muted-fg">
                      <p className="font-medium text-foreground mb-2">Sample prompts for <span className="text-[#00A8E8]">{item.label}</span></p>
                      {!item.samples || item.samples.length === 0 ? (
                        <p className="italic">No sample prompts available for this label.</p>
                      ) : (
                        <div className="space-y-2">
                          {item.samples.map((sample, i) => (
                            <div key={i} className="space-y-0.5">
                              <p className="italic">{sample.prompt_truncated}</p>
                              <span className="text-[10px] text-muted-fg/60 font-mono">{sample.user_id.slice(0, 12)}…</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
