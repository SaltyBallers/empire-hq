import { createClient } from '@supabase/supabase-js'

// --- Types ---

export type SyncResult = {
  provider: string
  status: 'ok' | 'skipped' | 'error'
  balance?: number
  error?: string
  flags?: string[]
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

function monthStartUnix(): number {
  const now = new Date()
  return Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000)
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000)
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

function sanitizeVercelMetadata(charges: { BilledCost?: number; EffectiveCost?: number }[], period: { from: string; to: string }): Record<string, unknown> {
  const effective = charges.reduce((sum, c) => sum + (c.EffectiveCost ?? 0), 0)
  const billed = charges.reduce((sum, c) => sum + (c.BilledCost ?? 0), 0)
  return {
    total_charges: effective,
    billed_cost: billed,
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

// OpenAI Costs API verbatim payload shape (verified 2026-07-06)
// GET https://api.openai.com/v1/organization/costs
// Auth: Bearer $OPENAI_ADMIN_API_KEY (Admin API key, not user key)
// Params: start_time (unix), end_time (unix), bucket_width (1d|1h), limit (max 180)
// Ref: https://platform.openai.com/docs/api-reference/organization-usage
interface OpenAICostBucketResult {
  object: 'costs.result'
  amount: { value: number; currency: string }
  line_item: string | null
  project_id: string | null
}
interface OpenAICostBucket {
  object: 'bucket'
  start_time: number
  end_time: number
  results: OpenAICostBucketResult[]
}
interface OpenAICostsResponse {
  object: 'page'
  data: OpenAICostBucket[]
  has_more: boolean
  next_page: string | null
}

function sanitizeOpenAIMetadata(body: OpenAICostsResponse, total: number): Record<string, unknown> {
  return {
    total_cost_usd: total,
    bucket_count: body.data?.length ?? 0,
    has_more: body.has_more ?? false,
  }
}

// Twilio Usage Records API verbatim payload shape (verified 2026-07-06)
// GET https://api.twilio.com/2010-04-01/Accounts/{SID}/Usage/Records/ThisMonth.json
// Auth: HTTP Basic (AccountSid:AuthToken), base64-encoded
// Ref: https://www.twilio.com/docs/usage/api/usage-record
interface TwilioUsageRecord {
  account_sid: string
  api_version: string
  as_of: string
  category: string
  count: string
  count_unit: string
  description: string
  end_date: string
  price: string
  price_unit: string
  start_date: string
  uri: string
  usage: string
  usage_unit: string
}
interface TwilioUsageResponse {
  usage_records: TwilioUsageRecord[]
  uri: string
  first_page_uri: string
  next_page_uri: string | null
  previous_page_uri: string | null
  page: number
  page_size: number
  start: number
  end: number
}

function sanitizeTwilioMetadata(body: TwilioUsageResponse, total: number): Record<string, unknown> {
  const totalRecord = body.usage_records?.find(r => r.category === 'totalprice')
  return {
    total_cost_usd: total,
    record_count: body.usage_records?.length ?? 0,
    start_date: totalRecord?.start_date ?? null,
    end_date: totalRecord?.end_date ?? null,
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
  // Team-owned billing data requires teamId (Vercel REST API). empire-hq lives under the bill-devlins-projects team.
  const teamId = process.env.VERCEL_TEAM_ID ?? 'team_RDOGdp3jwRA4BKolgJm1avkO'

  const res = await fetch(
    `https://api.vercel.com/v1/billing/charges?teamId=${teamId}&from=${monthStart}&to=${endAt}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`)

  let charges: { BilledCost?: number; EffectiveCost?: number }[] = []
  try {
    const text = await res.text()
    const lines = text.trim().split('\n').filter(Boolean)
    charges = lines.map((line) => JSON.parse(line))
  } catch (parseErr) {
    throw new Error(`Vercel API response parse failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`)
  }

  // EffectiveCost = true amortized spend (Pro seat + usage); BilledCost is only overage above plan (often $0).
  const total = charges.reduce(
    (sum: number, c: { EffectiveCost?: number }) => sum + (c.EffectiveCost ?? 0),
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

  // Endpoint: /v1/organizations/cost_report (Anthropic Admin API beta)
  // If this returns 404/403 after API drift, update to the current endpoint.
  const res = await fetch(
    `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${monthStart}&ending_at=${endAt}`,
    {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
    }
  )
  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 404 || res.status === 403) {
      return {
        provider: 'anthropic',
        status: 'skipped',
        error: `Anthropic cost_report endpoint ${res.status} — endpoint may have changed. Check docs.anthropic.com/en/api/admin-api`,
      }
    }
    throw new Error(`Anthropic API ${res.status}: ${errText}`)
  }

  const body = await res.json()
  const total = body.total_cost ?? 0

  await upsertCost(supabase, 'anthropic', 'monthly_cost', total, sanitizeAnthropicMetadata(body))
  return { provider: 'anthropic', status: 'ok', balance: total }
}

// US-B2: OpenAI Costs API (Type-B — actual $ via API)
// Requires OPENAI_ADMIN_API_KEY (Admin API key, not regular user key).
// FLAG: OPENAI_ADMIN_API_KEY not present in empire-hq .env.local — add to Vercel env vars.
export async function syncOpenAI(supabase: SupabaseAdmin): Promise<SyncResult> {
  const key = process.env.OPENAI_ADMIN_API_KEY
  if (!key) {
    return {
      provider: 'openai',
      status: 'skipped',
      error: 'OPENAI_ADMIN_API_KEY not set — add Admin API key from platform.openai.com/api-keys',
    }
  }

  const startTime = monthStartUnix()
  const endTime = nowUnix()

  const res = await fetch(
    `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&bucket_width=1d&limit=50`,
    { headers: { Authorization: `Bearer ${key}` } }
  )
  if (!res.ok) throw new Error(`OpenAI Costs API ${res.status}: ${await res.text()}`)

  const body = (await res.json()) as OpenAICostsResponse

  // Sum amount.value across all buckets and all results within each bucket
  let total = 0
  for (const bucket of body.data ?? []) {
    for (const result of bucket.results ?? []) {
      total += result.amount?.value ?? 0
    }
  }

  await upsertCost(supabase, 'openai', 'monthly_cost', total, sanitizeOpenAIMetadata(body, total))
  return { provider: 'openai', status: 'ok', balance: total }
}

// US-B2: Twilio Usage Records API (Type-B — actual $ via API)
// Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.
// FLAG: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not present in empire-hq .env.local.
export async function syncTwilio(supabase: SupabaseAdmin): Promise<SyncResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    return {
      provider: 'twilio',
      status: 'skipped',
      error: 'TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — add from console.twilio.com',
    }
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Usage/Records/ThisMonth.json`,
    { headers: { Authorization: `Basic ${credentials}` } }
  )
  if (!res.ok) throw new Error(`Twilio Usage API ${res.status}: ${await res.text()}`)

  const body = (await res.json()) as TwilioUsageResponse

  // Use the 'totalprice' category for the authoritative monthly total.
  // Falls back to summing all record prices if totalprice is absent.
  const totalRecord = body.usage_records?.find(r => r.category === 'totalprice')
  const total = totalRecord
    ? parseFloat(totalRecord.price || '0')
    : (body.usage_records ?? []).reduce((sum, r) => sum + parseFloat(r.price || '0'), 0)

  await upsertCost(supabase, 'twilio', 'monthly_cost', total, sanitizeTwilioMetadata(body, total))
  return { provider: 'twilio', status: 'ok', balance: total }
}

// US-B2: Type-A fixed recurring subscription syncs (Fly.io, Supabase, Axiom)
// Amounts are config-driven via env vars. If not set, writes $0 as an unconfirmed placeholder.
// FLAG: Set FLY_MONTHLY_COST, SUPABASE_MONTHLY_COST, AXIOM_MONTHLY_COST in Vercel env vars
//       once Bill/Eric confirms the actual subscription amounts.

function buildTypeAFlags(provider: string, amount: number, envKey: string): string[] {
  if (amount > 0) return []
  return [`PLACEHOLDER: ${provider} monthly subscription amount unconfirmed — set ${envKey} env var to the actual amount`]
}

export async function syncFly(supabase: SupabaseAdmin): Promise<SyncResult> {
  const amount = parseFloat(process.env.FLY_MONTHLY_COST || '0')
  const flags = buildTypeAFlags('Fly.io', amount, 'FLY_MONTHLY_COST')
  await upsertCost(supabase, 'fly', 'monthly_subscription', amount, {
    source: 'type_a_recurring',
    confirmed: amount > 0,
    config_key: 'FLY_MONTHLY_COST',
  })
  return { provider: 'fly', status: 'ok', balance: amount, flags }
}

export async function syncSupabaseSubscription(supabase: SupabaseAdmin): Promise<SyncResult> {
  const amount = parseFloat(process.env.SUPABASE_MONTHLY_COST || '0')
  const flags = buildTypeAFlags('Supabase', amount, 'SUPABASE_MONTHLY_COST')
  await upsertCost(supabase, 'supabase', 'monthly_subscription', amount, {
    source: 'type_a_recurring',
    confirmed: amount > 0,
    config_key: 'SUPABASE_MONTHLY_COST',
  })
  return { provider: 'supabase', status: 'ok', balance: amount, flags }
}

export async function syncAxiom(supabase: SupabaseAdmin): Promise<SyncResult> {
  const amount = parseFloat(process.env.AXIOM_MONTHLY_COST || '0')
  const flags = buildTypeAFlags('Axiom', amount, 'AXIOM_MONTHLY_COST')
  await upsertCost(supabase, 'axiom', 'monthly_subscription', amount, {
    source: 'type_a_recurring',
    confirmed: amount > 0,
    config_key: 'AXIOM_MONTHLY_COST',
  })
  return { provider: 'axiom', status: 'ok', balance: amount, flags }
}

// --- Sync all providers ---

export async function syncAllProviders(supabase: SupabaseAdmin): Promise<SyncResult[]> {
  const syncFns = [
    // Type-B: usage-metered via API (existing)
    { name: 'moonshot', fn: () => syncMoonshot(supabase) },
    { name: 'vercel', fn: () => syncVercel(supabase) },
    { name: 'anthropic', fn: () => syncAnthropic(supabase) },
    // Type-B: usage-metered via API (new)
    { name: 'openai', fn: () => syncOpenAI(supabase) },
    { name: 'twilio', fn: () => syncTwilio(supabase) },
    // Type-A: fixed recurring subscription (new)
    { name: 'fly', fn: () => syncFly(supabase) },
    { name: 'supabase', fn: () => syncSupabaseSubscription(supabase) },
    { name: 'axiom', fn: () => syncAxiom(supabase) },
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
