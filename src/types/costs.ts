export const ALL_PROVIDERS = [
  'anthropic', 'openai', 'brave', 'exa', 'perplexity',
  'moonshot', 'gemini', 'lovable', 'vercel', 'supabase', 'apify'
] as const

export type Provider = typeof ALL_PROVIDERS[number]

export interface AdminApiCost {
  id: string
  app: string
  provider: string
  date: string
  metric: string
  value: number
  metadata?: Record<string, unknown>
  created_at: string
}

export interface CostSummary {
  totalThisMonth: number
  totalLastMonth: number
  deltaPercent: number
  providerBreakdown: Record<string, number>
}

export interface ProviderStats {
  provider: string
  totalSpend: number
  apiCalls: number
  averageCostPerCall: number
  lastEntry?: AdminApiCost
}

export interface DailyCost {
  date: string
  providers: Record<string, number>
  total: number
}

export interface BudgetStatus {
  status: 'green' | 'yellow' | 'red'
  percentage: number
  isOverBudget: boolean
}

// Monthly budget limits per provider (USD)
export const MONTHLY_BUDGETS: Record<string, number> = {
  anthropic: 500,
  openai: 200,
  brave: 25,
  exa: 50,
  perplexity: 50,
  moonshot: 25,
  gemini: 50,
  lovable: 50,
  vercel: 50,
  supabase: 75,
  apify: 100
}

// Provider display config
export const PROVIDER_CONFIG: Record<string, { label: string; color: string; hasApi: boolean; dashboardUrl: string }> = {
  anthropic: { label: 'Anthropic', color: '#d97706', hasApi: true, dashboardUrl: 'https://console.anthropic.com/settings/billing' },
  openai: { label: 'OpenAI', color: '#10b981', hasApi: true, dashboardUrl: 'https://platform.openai.com/usage' },
  brave: { label: 'Brave', color: '#ef4444', hasApi: false, dashboardUrl: 'https://api-dashboard.search.brave.com' },
  exa: { label: 'Exa', color: '#6366f1', hasApi: false, dashboardUrl: 'https://dashboard.exa.ai' },
  perplexity: { label: 'Perplexity', color: '#06b6d4', hasApi: false, dashboardUrl: 'https://perplexity.ai/settings' },
  moonshot: { label: 'Kimi/Moonshot', color: '#ec4899', hasApi: false, dashboardUrl: 'https://platform.moonshot.ai/console' },
  gemini: { label: 'Gemini', color: '#3b82f6', hasApi: false, dashboardUrl: 'https://aistudio.google.com' },
  lovable: { label: 'Lovable', color: '#f43f5e', hasApi: false, dashboardUrl: 'https://lovable.dev' },
  vercel: { label: 'Vercel', color: '#8b5cf6', hasApi: true, dashboardUrl: 'https://vercel.com/bill-devlins-projects/~/usage' },
  supabase: { label: 'Supabase', color: '#f59e0b', hasApi: true, dashboardUrl: 'https://supabase.com/dashboard' },
  apify: { label: 'Apify', color: '#0ea5e9', hasApi: true, dashboardUrl: 'https://console.apify.com/billing' }
}
