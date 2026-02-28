'use client'

import type { CostSummary, BudgetStatus } from '@/types/costs'

interface CostSummaryCardsProps {
  summary: CostSummary
  budgets: Record<string, number>
}

export function CostSummaryCards({ summary, budgets }: CostSummaryCardsProps) {
  const getBudgetStatus = (provider: string, spent: number): BudgetStatus => {
    const budget = budgets[provider] || 100
    const percentage = (spent / budget) * 100
    
    if (percentage >= 75) {
      return { status: 'red', percentage, isOverBudget: percentage >= 100 }
    } else if (percentage >= 50) {
      return { status: 'yellow', percentage, isOverBudget: false }
    } else {
      return { status: 'green', percentage, isOverBudget: false }
    }
  }

  const deltaColor = summary.deltaPercent >= 0 
    ? 'text-red-400' 
    : 'text-green-400'
  
  const deltaIcon = summary.deltaPercent >= 0 ? '↗' : '↓'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Spend This Month */}
      <div className="bg-card-bg border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <span className="text-sm text-muted-fg">Total This Month</span>
        </div>
        <div className="text-2xl font-bold text-foreground mb-1">
          ${summary.totalThisMonth.toFixed(2)}
        </div>
        <div className={`text-xs ${deltaColor} flex items-center gap-1`}>
          <span>{deltaIcon}</span>
          <span>{Math.abs(summary.deltaPercent).toFixed(1)}% from last month</span>
        </div>
      </div>

      {/* Provider Breakdown Cards */}
      {Object.entries(summary.providerBreakdown).map(([provider, amount]) => {
        const budget = getBudgetStatus(provider, amount)
        const statusColors = {
          green: { bg: 'bg-green-400/10', text: 'text-green-400', border: 'border-green-400/20' },
          yellow: { bg: 'bg-yellow-400/10', text: 'text-yellow-400', border: 'border-yellow-400/20' },
          red: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' }
        }
        
        const colors = statusColors[budget.status]
        
        return (
          <div key={provider} className={`bg-card-bg border ${colors.border} rounded-lg p-6`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')}`}></div>
                <span className="text-sm text-muted-fg capitalize">{provider}</span>
              </div>
              {budget.isOverBudget && (
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              )}
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              ${amount.toFixed(2)}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${colors.text}`}>
                {budget.percentage.toFixed(0)}% of budget
              </span>
              <span className="text-xs text-muted-fg">
                ${budgets[provider] || 100}/mo
              </span>
            </div>
            
            {/* Budget progress bar */}
            <div className="mt-3 w-full bg-border rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${colors.text.replace('text-', 'bg-')}`}
                style={{ width: `${Math.min(budget.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}