'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ALL_PROVIDERS, PROVIDER_CONFIG } from '@/types/costs'

const supabase = createClient()

interface ManualCostEntryProps {
  onSuccess: () => void
  onCancel: () => void
}

export function ManualCostEntry({ onSuccess, onCancel }: ManualCostEntryProps) {
  const [provider, setProvider] = useState<string>(ALL_PROVIDERS[0])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [metric, setMetric] = useState('monthly_cost')
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value || isNaN(Number(value))) {
      setError('Please enter a valid amount')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const { error: insertError } = await supabase
        .from('admin_api_costs')
        .insert({
          app: 'empire',
          provider,
          date,
          metric,
          value: Number(value),
          metadata: { source: 'manual_entry' }
        })

      if (insertError) throw insertError
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-card-bg border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Log Manual Cost</h3>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm text-muted-fg mb-1">Provider</label>
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
          >
            {ALL_PROVIDERS.map(p => (
              <option key={p} value={p}>{PROVIDER_CONFIG[p]?.label || p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted-fg mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-muted-fg mb-1">Metric</label>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
          >
            <option value="monthly_cost">Monthly Cost</option>
            <option value="api_calls">API Calls</option>
            <option value="credits_used">Credits Used</option>
            <option value="tokens_used">Tokens Used</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted-fg mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0.00"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-border text-foreground rounded-lg text-sm font-medium hover:bg-border/80 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
