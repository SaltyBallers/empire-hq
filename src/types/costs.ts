export interface AdminApiCost {
  id: string
  app: string
  provider: 'apify' | 'openai' | 'vercel' | 'supabase'
  date: string
  metric: string
  value: number
  metadata?: Record<string, any>
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

// Monthly budget limits (can be moved to config)
export const MONTHLY_BUDGETS: Record<string, number> = {
  apify: 100,
  openai: 200,
  vercel: 50,
  supabase: 75
}