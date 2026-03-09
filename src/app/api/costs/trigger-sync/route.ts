import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Verify user is authenticated via Supabase session
async function getAuthUser() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // read-only in route handlers
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// Admin supabase client for writes
function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

async function upsertCost(
  supabase: ReturnType<typeof getAdminSupabase>,
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

type SyncResult = {
  provider: string
  status: 'ok' | 'skipped' | 'error'
  balance?: number
  error?: string
}

async function syncMoonshot(supabase: ReturnType<typeof getAdminSupabase>): Promise<SyncResult> {
  const key = process.env.MOONSHOT_API_KEY
  if (!key) return { provider: 'moonshot', status: 'skipped', error: 'MOONSHOT_API_KEY not set' }

  const res = await fetch('https://api.moonshot.ai/v1/users/me/balance', {
    headers: { Authorization: `Bearer ${key}` },
  })
  if (!res.ok) throw new Error(`Moonshot API ${res.status}: ${await res.text()}`)

  const body = await res.json()
  const balance = body.data.available_balance

  await upsertCost(supabase, 'moonshot', 'balance', balance, {
    available_balance: body.data.available_balance,
    voucher_balance: body.data.voucher_balance,
    cash_balance: body.data.cash_balance,
  })
  return { provider: 'moonshot', status: 'ok', balance }
}

async function syncVercel(supabase: ReturnType<typeof getAdminSupabase>): Promise<SyncResult> {
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

  await upsertCost(supabase, 'vercel', 'current_period_charges', total, {
    total_charges: total,
    line_count: charges.length,
    period: { from: monthStart, to: endAt },
  })
  return { provider: 'vercel', status: 'ok', balance: total }
}

async function syncAnthropic(supabase: ReturnType<typeof getAdminSupabase>): Promise<SyncResult> {
  const key = process.env.ANTHROPIC_ADMIN_API_KEY
  if (!key) return { provider: 'anthropic', status: 'skipped', error: 'ANTHROPIC_ADMIN_API_KEY not configured' }

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

  await upsertCost(supabase, 'anthropic', 'monthly_cost', total, {
    total_cost: body.total_cost,
    model_breakdown: body.model_breakdown,
  })
  return { provider: 'anthropic', status: 'ok', balance: total }
}

export async function POST(_request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminSupabase()

  const syncFns = [
    { name: 'moonshot', fn: () => syncMoonshot(supabase) },
    { name: 'vercel', fn: () => syncVercel(supabase) },
    { name: 'anthropic', fn: () => syncAnthropic(supabase) },
  ]

  const results: SyncResult[] = await Promise.all(
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

  return NextResponse.json({ results, synced_at: new Date().toISOString() })
}
