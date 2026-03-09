import { createClient } from '@supabase/supabase-js'

// --- Types ---

export type SyncResult = {
  provider: string
  status: 'ok' | 'skipped' | 'error'
  balance?: number
  error?: string
}

// --- Supabase admin client ---

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type SupabaseAdmin = ReturnType<typeof getSupabase>

function today() {
  return new Date().toISOString().slice(0, 10)
}

// --- Metadata sanitizers ---

function sanitizeMoonshotMetadata(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data as Record<string, unknown> | undefined
  if (!data) return {}
  return {
    available_balance: data.available_balance,
    voucher_balance: data.voucher_balance,
    cash_balance: data.cash_balance,
  }
}

function sanitizeVercelMetadata(charges: { BilledCost?: number }[], period: { from: string; to: string }): Record<string, unknown> {
  const total = charges.reduce((sum, c) => sum + (c.BilledCost ?? 0), 0)
  return {
    total_charges: total,
    line_count: charges.length,
    period,
  }
}

function sanitizeAnthropicMetadata(body: Record<string, unknown>): Record<string, unknown> {
  return {
    total_cost: body.total_cost,
    model_breakdown: body.model_breakdown,
  }
}

// --- Upsert helper ---

export async function upsertCost(
  supabase: SupabaseAdmin,
  provider: string,
  metric: string,
  value: number,
  metadata: Record<string, unknown> | null = null
) {
  const date = today()

  const { error } = await supabase
    .from('admin_api_costs')
    .upsert(
      { app: 'empire', provider, date, metric, value, metadata },
      { onConflict: 'app,provider,date,metric' }
    )
  if (error) throw new Error(error.message)
}

// --- Provider functions ---

export async function syncMoonshot(supabase: SupabaseAdmin): Promise<SyncResult> {
  const key = process.env.MOONSHOT_API_KEY
  if (!key) return { provider: 'moonshot', status: 'skipped', error: 'MOONSHOT_API_KEY not set' }

  const res = await fetch('https://api.moonshot.ai/v1/users/me/balance', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Moonshot API ${res.status}: ${await res.text()}`)

  const body = await res.json()
  const balance = body.data.available_balance

  await upsertCost(supabase, 'moonshot', 'balance', balance, sanitizeMoonshotMetadata(body))
  return { provider: 'moonshot', status: 'ok', balance }
}

export async function syncVercel(supabase: SupabaseAdmin): Promise<SyncResult> {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) return { provider: 'vercel', status: 'skipped', error: 'VERCEL_API_TOKEN not set' }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endAt = now.toISOString()

  const res = await fetch(
    `https://api.vercel.com/v1/billing/charges?from=${monthStart}&to=${endAt}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`)

  const text = await res.text()
  const lines = text.trim().split('\n').filter(Boolean)
  const charges = lines.map((line) => JSON.parse(line))
  const total = charges.reduce(
    (sum: number, c: { BilledCost?: number }) => sum + (c.BilledCost ?? 0),
    0
  )

  const period = { from: monthStart, to: endAt }
  await upsertCost(supabase, 'vercel', 'current_period_charges', total, sanitizeVercelMetadata(charges, period))
  return { provider: 'vercel', status: 'ok', balance: total }
}

export async function syncAnthropic(supabase: SupabaseAdmin): Promise<SyncResult> {
  const key = process.env.ANTHROPIC_ADMIN_API_KEY
  if (!key) {
    console.warn('Anthropic Admin API key not configured — skipping')
    return { provider: 'anthropic', status: 'skipped', error: 'ANTHROPIC_ADMIN_API_KEY not configured' }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endAt = now.toISOString()

  const res = await fetch(
    `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${monthStart}&ending_at=${endAt}`,
    {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
    }
  )
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)

  const body = await res.json()
  const total = body.total_cost ?? 0

  await upsertCost(supabase, 'anthropic', 'monthly_cost', total, sanitizeAnthropicMetadata(body))
  return { provider: 'anthropic', status: 'ok', balance: total }
}

// --- Sync all providers ---

export async function syncAllProviders(supabase: SupabaseAdmin): Promise<SyncResult[]> {
  const syncFns = [
    { name: 'moonshot', fn: () => syncMoonshot(supabase) },
    { name: 'vercel', fn: () => syncVercel(supabase) },
    { name: 'anthropic', fn: () => syncAnthropic(supabase) },
  ]

  return Promise.all(
    syncFns.map(async ({ name, fn }) => {
      try {
        return await fn()
      } catch (err) {
        return {
          provider: name,
          status: 'error' as const,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    })
  )
}
