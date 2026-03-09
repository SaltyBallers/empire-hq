import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// --- Supabase admin client ---

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// --- Upsert helper ---

async function upsertCost(
  provider: string,
  metric: string,
  value: number,
  metadata: Record<string, unknown> | null = null
) {
  const supabase = getSupabase()
  const date = today()

  // Check for existing row
  const { data: existing } = await supabase
    .from('admin_api_costs')
    .select('id')
    .eq('app', 'empire')
    .eq('provider', provider)
    .eq('date', date)
    .eq('metric', metric)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('admin_api_costs')
      .update({ value, metadata })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('admin_api_costs')
      .insert({ app: 'empire', provider, date, metric, value, metadata })
    if (error) throw error
  }
}

// --- Provider functions ---

type SyncResult = {
  provider: string
  status: 'ok' | 'skipped' | 'error'
  balance?: number
  error?: string
}

async function syncMoonshot(): Promise<SyncResult> {
  const key = process.env.MOONSHOT_API_KEY
  if (!key) return { provider: 'moonshot', status: 'skipped', error: 'MOONSHOT_API_KEY not set' }

  const res = await fetch('https://api.moonshot.ai/v1/users/me/balance', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Moonshot API ${res.status}: ${await res.text()}`)

  const body = await res.json()
  const balance = body.data.available_balance

  await upsertCost('moonshot', 'balance', balance, body)
  return { provider: 'moonshot', status: 'ok', balance }
}

async function syncVercel(): Promise<SyncResult> {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) return { provider: 'vercel', status: 'skipped', error: 'VERCEL_API_TOKEN not set' }

  // Vercel billing/charges requires from/to as ISO 8601 dates
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endAt = now.toISOString()

  const res = await fetch(
    `https://api.vercel.com/v1/billing/charges?from=${monthStart}&to=${endAt}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`)

  // Response is NDJSON (one JSON object per line)
  const text = await res.text()
  const lines = text.trim().split('\n').filter(Boolean)
  const charges = lines.map((line) => JSON.parse(line))
  const total = charges.reduce(
    (sum: number, c: { BilledCost?: number }) => sum + (c.BilledCost ?? 0),
    0
  )

  const metadata = { charge_count: charges.length, period: { from: monthStart, to: endAt } }
  await upsertCost('vercel', 'current_period_charges', total, metadata)
  return { provider: 'vercel', status: 'ok', balance: total }
}

async function syncAnthropic(): Promise<SyncResult> {
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

  await upsertCost('anthropic', 'monthly_cost', total, body)
  return { provider: 'anthropic', status: 'ok', balance: total }
}

// --- Route handlers ---

const providers = [syncMoonshot, syncVercel, syncAnthropic]

export async function POST() {
  const results: SyncResult[] = await Promise.all(
    providers.map(async (fn) => {
      try {
        return await fn()
      } catch (err) {
        return {
          provider: fn.name.replace('sync', '').toLowerCase(),
          status: 'error' as const,
          error: err instanceof Error ? err.message : String(err),
        }
      }
    })
  )

  return NextResponse.json({ results, synced_at: new Date().toISOString() })
}

export async function GET() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('admin_api_costs')
    .select('*')
    .eq('app', 'empire')
    .order('date', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ costs: data })
}
