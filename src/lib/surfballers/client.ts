import { createClient } from '@supabase/supabase-js'

export function getSurfballersSupabase() {
  return createClient(
    process.env.SURFBALLERS_SUPABASE_URL!,
    process.env.SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function isSurfballersConfigured(): boolean {
  return !!(
    process.env.SURFBALLERS_SUPABASE_URL &&
    process.env.SURFBALLERS_SUPABASE_SERVICE_ROLE_KEY
  )
}
