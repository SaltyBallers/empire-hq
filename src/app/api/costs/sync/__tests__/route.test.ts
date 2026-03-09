import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock supabase
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args)
        const chainable = {
          eq: () => chainable,
          order: () => chainable,
          limit: () => ({ data: [], error: null }),
          maybeSingle: () => {
            mockMaybeSingle()
            return { data: null }
          },
        }
        return chainable
      },
      insert: (data: unknown) => {
        mockInsert(data)
        return { error: null }
      },
      update: (data: unknown) => {
        mockUpdate(data)
        return { eq: () => ({ error: null }) }
      },
      order: () => ({
        limit: () => ({ data: [], error: null }),
      }),
    }),
  }),
}))

// Set env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
process.env.MOONSHOT_API_KEY = 'test-moonshot-key'
process.env.VERCEL_API_TOKEN = 'test-vercel-token'

describe('POST /api/costs/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ANTHROPIC_ADMIN_API_KEY
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
    const res = await POST()
    const body = await res.json()

    expect(body.results).toBeDefined()
    const moonshot = body.results.find((r: { provider: string }) => r.provider === 'moonshot')
    expect(moonshot.status).toBe('ok')
    expect(moonshot.balance).toBe(19.98)
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
    const res = await POST()
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
    const res = await POST()
    const body = await res.json()

    const moonshot = body.results.find((r: { provider: string }) => r.provider === 'moonshot')
    expect(moonshot.status).toBe('error')
    expect(moonshot.error).toContain('401')
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
