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

function makePostRequest(secret?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (secret) headers['authorization'] = `Bearer ${secret}`
  return new NextRequest('http://localhost/api/costs/sync', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/costs/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.ANTHROPIC_ADMIN_API_KEY
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
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('moonshot')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              code: 0,
              data: { available_balance: 10, voucher_balance: 0, cash_balance: 10 },
              status: true,
            }),
        })
      }
      if (url.includes('vercel')) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const anthropic = body.results.find((r: { provider: string }) => r.provider === 'anthropic')
    expect(anthropic.status).toBe('skipped')
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

  it('uses upsert with onConflict', async () => {
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
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { POST } = await import('../route')
    await POST(makePostRequest('test-cron-secret'))

    expect(mockUpsert).toHaveBeenCalled()
    const opts = mockUpsert.mock.calls[0][1] as { onConflict: string }
    expect(opts.onConflict).toBe('app,provider,date,metric')
  })

  it('handles supabase write errors', async () => {
    mockUpsert.mockImplementationOnce(() => ({ error: { message: 'DB write failed' } }))

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
        return Promise.resolve({ ok: true, text: () => Promise.resolve('') })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    const { POST } = await import('../route')
    const res = await POST(makePostRequest('test-cron-secret'))
    const body = await res.json()

    const moonshot = body.results.find((r: { provider: string }) => r.provider === 'moonshot')
    expect(moonshot.status).toBe('error')
    expect(moonshot.error).toContain('DB write failed')
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
