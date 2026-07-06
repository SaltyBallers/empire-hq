import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock supabase
const mockUpsert = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      mockFrom(table)
      return {
        upsert: (data: unknown, opts: unknown) => {
          return mockUpsert(data, opts) ?? { error: null }
        },
        select: () => {
          const chainable: Record<string, unknown> = {}
          chainable.eq = () => chainable
          chainable.order = () => chainable
          chainable.limit = () => ({ data: [], error: null })
          return chainable
        },
      }
    },
  }),
}))

// Set env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
process.env.MOONSHOT_API_KEY = 'test-moonshot-key'
process.env.VERCEL_API_TOKEN = 'test-vercel-token'
process.env.CRON_SECRET = 'test-cron-secret'
// Type-A amounts not set → placeholder $0 writes
delete process.env.FLY_MONTHLY_COST
delete process.env.SUPABASE_MONTHLY_COST
delete process.env.AXIOM_MONTHLY_COST
// Type-B keys not set → skipped
delete process.env.OPENAI_ADMIN_API_KEY
delete process.env.TWILIO_ACCOUNT_SID
delete process.env.TWILIO_AUTH_TOKEN

function makePostRequest(secret?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/costs/sync', {
    method: 'POST',
    headers,
  })
}

// Default fetch mock — works for all new tests unless overridden
function defaultFetchMock() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('moonshot')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            code: 0,
            data: { available_balance: 19.98, voucher_balance: 0, cash_balance: 19.98 },
            status: true,
          }),
      })
    }
    if (url.includes('vercel')) {
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('{"BilledCost":0,"ServiceName":"test"}'),
      })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
  })
}

describe('POST /api/costs/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.ANTHROPIC_ADMIN_API_KEY
    delete process.env.OPENAI_ADMIN_API_KEY
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  it('returns 401 without CRON_SECRET', async () => {
    const { POST } = await import('../route')
    const res = await POST(makePostRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong CRON_SECRET', async () => {
    const { POST } = await import('../route')
    const res = await POST(makePostRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('syncs moonshot balance successfully', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    const moonshot = body.results.find((r: { provider: string }) => r.provider === 'moonshot')
    expect(moonshot.status).toBe('ok')
    expect(moonshot.balance).toBe(19.98)
  })

  it('sanitizes moonshot metadata', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('moonshot')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: 0,
              data: { available_balance: 10, voucher_balance: 0, cash_balance: 10, secret_field: 'leaked' },
              status: true,
              internal_id: 'should-not-store',
            }),
        })
      }
      if (url.includes('vercel')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { POST } = await import('../route')
    await POST(makePostRequest('test-cron-secret'))

    const moonshotCall = mockUpsert.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).provider === 'moonshot'
    )
    expect(moonshotCall).toBeDefined()
    const metadata = (moonshotCall![0] as Record<string, unknown>).metadata as Record<string, unknown>
    expect(metadata).toHaveProperty('available_balance')
    expect(metadata).not.toHaveProperty('secret_field')
    expect(metadata).not.toHaveProperty('internal_id')
  })

  it('skips anthropic when key not set', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const anthropic = body.results.find((r: { provider: string }) => r.provider === 'anthropic')
    expect(anthropic.status).toBe('skipped')
  })

  it('skips openai when OPENAI_ADMIN_API_KEY not set', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const openai = body.results.find((r: { provider: string }) => r.provider === 'openai')
    expect(openai.status).toBe('skipped')
    expect(openai.error).toContain('OPENAI_ADMIN_API_KEY')
  })

  it('skips twilio when keys not set', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const twilio = body.results.find((r: { provider: string }) => r.provider === 'twilio')
    expect(twilio.status).toBe('skipped')
    expect(twilio.error).toContain('TWILIO_ACCOUNT_SID')
  })

  it('writes type-a placeholder for fly when FLY_MONTHLY_COST not set', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const fly = body.results.find((r: { provider: string }) => r.provider === 'fly')
    expect(fly.status).toBe('ok')
    expect(fly.flags).toBeDefined()
    expect(fly.flags.length).toBeGreaterThan(0)
    expect(fly.flags[0]).toContain('FLY_MONTHLY_COST')

    const flyUpsert = mockUpsert.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).provider === 'fly'
    )
    expect(flyUpsert).toBeDefined()
    const flyData = flyUpsert![0] as Record<string, unknown>
    expect(flyData.metric).toBe('monthly_subscription')
    expect(flyData.value).toBe(0)
    const meta = flyData.metadata as Record<string, unknown>
    expect(meta.confirmed).toBe(false)
  })

  it('writes configured type-a amount when env var is set', async () => {
    process.env.FLY_MONTHLY_COST = '29.99'
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const fly = body.results.find((r: { provider: string }) => r.provider === 'fly')
    expect(fly.status).toBe('ok')
    expect(fly.balance).toBe(29.99)
    expect(fly.flags ?? []).toHaveLength(0)

    const flyUpsert = mockUpsert.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).provider === 'fly'
    )
    const meta = (flyUpsert![0] as Record<string, unknown>).metadata as Record<string, unknown>
    expect(meta.confirmed).toBe(true)

    delete process.env.FLY_MONTHLY_COST
  })

  it('handles moonshot API errors gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('moonshot')) {
        return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') })
      }
      if (url.includes('vercel')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const moonshot = body.results.find((r: { provider: string }) => r.provider === 'moonshot')
    expect(moonshot.status).toBe('error')
    expect(moonshot.error).toContain('401')
  })

  it('handles vercel API errors gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('moonshot')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { available_balance: 10, voucher_balance: 0, cash_balance: 10 },
            }),
        })
      }
      if (url.includes('vercel')) {
        return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('Internal Server Error') })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const vercel = body.results.find((r: { provider: string }) => r.provider === 'vercel')
    expect(vercel.status).toBe('error')
    expect(vercel.error).toContain('500')
  })

  it('uses upsert with onConflict for all writes', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    await POST(makePostRequest('test-cron-secret'))

    expect(mockUpsert).toHaveBeenCalled()
    // Every upsert must use the correct conflict key
    for (const call of mockUpsert.mock.calls) {
      expect((call[1] as { onConflict: string }).onConflict).toBe('app,provider,date,metric')
    }
  })

  it('handles supabase write errors', async () => {
    mockUpsert.mockImplementationOnce(() => ({ error: { message: 'DB write failed' } }))

    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    // Some provider should have failed
    const failed = body.results.find(
      (r: { status: string; error?: string }) => r.status === 'error'
    )
    expect(failed).toBeDefined()
    expect(failed.error).toContain('DB write failed')
  })

  it('returns results for all 8 synced providers', async () => {
    defaultFetchMock()

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const providers = body.results.map((r: { provider: string }) => r.provider)
    expect(providers).toContain('moonshot')
    expect(providers).toContain('vercel')
    expect(providers).toContain('anthropic')
    expect(providers).toContain('openai')
    expect(providers).toContain('twilio')
    expect(providers).toContain('fly')
    expect(providers).toContain('supabase')
    expect(providers).toContain('axiom')
  })
})

describe('GET /api/costs/sync', () => {
  it('returns costs from supabase', async () => {
    const { GET } = await import('../route')
    const res = await GET()
    const body = await res.json()
    expect(body.costs).toBeDefined()
  })
})

// --- Unit tests for sync functions ---
describe('syncOpenAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('skips when OPENAI_ADMIN_API_KEY not set', async () => {
    delete process.env.OPENAI_ADMIN_API_KEY
    const { syncOpenAI, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncOpenAI(getSupabase())
    expect(result.status).toBe('skipped')
    expect(result.error).toContain('OPENAI_ADMIN_API_KEY')
  })

  it('computes total from bucket results', async () => {
    process.env.OPENAI_ADMIN_API_KEY = 'test-admin-key'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          object: 'page',
          data: [
            {
              object: 'bucket',
              start_time: 1751760000,
              end_time: 1751846400,
              results: [
                { object: 'costs.result', amount: { value: 1.50, currency: 'usd' }, line_item: null, project_id: null },
                { object: 'costs.result', amount: { value: 0.25, currency: 'usd' }, line_item: 'gpt-4o', project_id: null },
              ],
            },
            {
              object: 'bucket',
              start_time: 1751846400,
              end_time: 1751932800,
              results: [
                { object: 'costs.result', amount: { value: 0.75, currency: 'usd' }, line_item: null, project_id: null },
              ],
            },
          ],
          has_more: false,
          next_page: null,
        }),
    })

    const { syncOpenAI, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncOpenAI(getSupabase())

    expect(result.status).toBe('ok')
    expect(result.balance).toBeCloseTo(2.50, 4)

    const upsertCall = mockUpsert.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).provider === 'openai'
    )
    expect(upsertCall).toBeDefined()
    expect((upsertCall![0] as Record<string, unknown>).metric).toBe('monthly_cost')
    expect((upsertCall![0] as Record<string, unknown>).value).toBeCloseTo(2.50, 4)

    delete process.env.OPENAI_ADMIN_API_KEY
  })

  it('handles OpenAI API errors gracefully', async () => {
    process.env.OPENAI_ADMIN_API_KEY = 'test-admin-key'
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })

    const { syncOpenAI, getSupabase } = await import('@/lib/costs/sync')
    await expect(syncOpenAI(getSupabase())).rejects.toThrow('OpenAI Costs API 403')

    delete process.env.OPENAI_ADMIN_API_KEY
  })
})

describe('syncTwilio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('skips when TWILIO_ACCOUNT_SID not set', async () => {
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    const { syncTwilio, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncTwilio(getSupabase())
    expect(result.status).toBe('skipped')
    expect(result.error).toContain('TWILIO_ACCOUNT_SID')
  })

  it('uses totalprice category when present', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123'
    process.env.TWILIO_AUTH_TOKEN = 'authtoken'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          usage_records: [
            {
              account_sid: 'ACtest123',
              category: 'calls',
              description: 'Programmable Voice',
              count: '5',
              count_unit: 'calls',
              usage: '5.0',
              usage_unit: 'minutes',
              price: '0.04',
              price_unit: 'USD',
              start_date: '2026-07-01',
              end_date: '2026-07-06',
              as_of: '2026-07-06T10:00:00Z',
              api_version: '2010-04-01',
              uri: '/2010-04-01/Accounts/ACtest123/Usage/Records/ThisMonth.json?Category=calls',
            },
            {
              account_sid: 'ACtest123',
              category: 'totalprice',
              description: 'Total Price',
              count: '1',
              count_unit: 'USD',
              usage: '12.50',
              usage_unit: 'USD',
              price: '12.50',
              price_unit: 'USD',
              start_date: '2026-07-01',
              end_date: '2026-07-06',
              as_of: '2026-07-06T10:00:00Z',
              api_version: '2010-04-01',
              uri: '/2010-04-01/Accounts/ACtest123/Usage/Records/ThisMonth.json?Category=totalprice',
            },
          ],
          uri: '/2010-04-01/Accounts/ACtest123/Usage/Records/ThisMonth.json',
          first_page_uri: '/2010-04-01/Accounts/ACtest123/Usage/Records/ThisMonth.json?Page=0',
          next_page_uri: null,
          previous_page_uri: null,
          page: 0,
          page_size: 50,
          start: 0,
          end: 1,
        }),
    })

    const { syncTwilio, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncTwilio(getSupabase())

    expect(result.status).toBe('ok')
    expect(result.balance).toBe(12.50)

    const upsertCall = mockUpsert.mock.calls.find(
      (call: unknown[]) => (call[0] as Record<string, unknown>).provider === 'twilio'
    )
    expect(upsertCall).toBeDefined()
    expect((upsertCall![0] as Record<string, unknown>).value).toBe(12.50)

    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
  })

  it('falls back to summing all prices when totalprice absent', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123'
    process.env.TWILIO_AUTH_TOKEN = 'authtoken'

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          usage_records: [
            { category: 'calls', price: '3.00', price_unit: 'USD', start_date: '2026-07-01', end_date: '2026-07-06', as_of: '', api_version: '', uri: '', account_sid: '', description: '', count: '', count_unit: '', usage: '', usage_unit: '' },
            { category: 'sms', price: '1.50', price_unit: 'USD', start_date: '2026-07-01', end_date: '2026-07-06', as_of: '', api_version: '', uri: '', account_sid: '', description: '', count: '', count_unit: '', usage: '', usage_unit: '' },
          ],
          uri: '', first_page_uri: '', next_page_uri: null, previous_page_uri: null, page: 0, page_size: 50, start: 0, end: 1,
        }),
    })

    const { syncTwilio, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncTwilio(getSupabase())

    expect(result.status).toBe('ok')
    expect(result.balance).toBeCloseTo(4.50, 4)

    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
  })
})

describe('Type-A recurring syncs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('syncFly writes placeholder with flag when FLY_MONTHLY_COST not set', async () => {
    delete process.env.FLY_MONTHLY_COST
    const { syncFly, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncFly(getSupabase())
    expect(result.status).toBe('ok')
    expect(result.balance).toBe(0)
    expect(result.flags?.length).toBeGreaterThan(0)
  })

  it('syncFly writes confirmed amount when FLY_MONTHLY_COST is set', async () => {
    process.env.FLY_MONTHLY_COST = '19.99'
    const { syncFly, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncFly(getSupabase())
    expect(result.status).toBe('ok')
    expect(result.balance).toBe(19.99)
    expect(result.flags ?? []).toHaveLength(0)
    delete process.env.FLY_MONTHLY_COST
  })

  it('syncSupabaseSubscription writes placeholder when not set', async () => {
    delete process.env.SUPABASE_MONTHLY_COST
    const { syncSupabaseSubscription, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncSupabaseSubscription(getSupabase())
    expect(result.status).toBe('ok')
    expect(result.balance).toBe(0)
    expect(result.flags?.length).toBeGreaterThan(0)
  })

  it('syncAxiom writes placeholder when not set', async () => {
    delete process.env.AXIOM_MONTHLY_COST
    const { syncAxiom, getSupabase } = await import('@/lib/costs/sync')
    const result = await syncAxiom(getSupabase())
    expect(result.status).toBe('ok')
    expect(result.balance).toBe(0)
    expect(result.flags?.length).toBeGreaterThan(0)
  })
})
