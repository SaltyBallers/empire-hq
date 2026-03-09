import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, syncAllProviders } from '@/lib/costs/sync'

// --- Auth helper ---

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return authHeader === `Bearer ${secret}`
}

// --- Route handlers ---

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const results = await syncAllProviders(supabase)

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
