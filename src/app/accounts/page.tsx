'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { AppLayout } from '@/components/AppLayout'
import type { 
  SeedAccount, 
  VQSBenchmark, 
  AccountWithVQS, 
  DataQualitySummary,
  VQSScoreLevel
} from '@/types/accounts'
import { 
  getVQSScoreLevel, 
  getVQSColorClass, 
  formatAccountIssues 
} from '@/types/accounts'

// Stable client reference at module scope — prevents useCallback invalidation
const supabase = createClient()

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountWithVQS[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVertical, setSelectedVertical] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  // Fetch seed accounts and VQS data
  const fetchAccountsData = useCallback(async () => {
    try {
      if (accounts.length > 0) {
        // Don't clear error on refresh — keep stale data visible
      } else {
        setError(null)
      }

      // Fetch seed accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('vertical_seed_accounts')
        .select('*')
        .order('vertical', { ascending: true })
        .order('username', { ascending: true })

      if (accountsError) throw accountsError

      // Fetch VQS benchmarks (may be empty)
      const { data: benchmarksData, error: benchmarksError } = await supabase
        .from('vertical_benchmarks')
        .select('*')

      if (benchmarksError) {
        console.warn('VQS benchmarks table error:', benchmarksError)
      }

      // Get post counts for each account
      const { data: postsData, error: postsError } = await supabase
        .from('seed_account_posts')
        .select('seed_account_id')

      if (postsError) {
        console.warn('Posts data error:', postsError)
      }

      // Process data
      const postCounts = (postsData || []).reduce((acc, post) => {
        acc[post.seed_account_id] = (acc[post.seed_account_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const benchmarkMap = (benchmarksData || []).reduce((acc, benchmark) => {
        acc[benchmark.account_username] = benchmark
        return acc
      }, {} as Record<string, VQSBenchmark>)

      // Combine data and calculate issues
      const processedAccounts: AccountWithVQS[] = (accountsData || []).map(account => {
        const postCount = postCounts[account.id] || 0
        const isStale = account.last_scraped_at ? 
          (new Date().getTime() - new Date(account.last_scraped_at).getTime()) > (7 * 24 * 60 * 60 * 1000) :
          true
        
        const hasIssues = !account.follower_count || postCount === 0 || isStale
        const missingData = formatAccountIssues({
          ...account,
          post_count: postCount,
          has_issues: hasIssues,
          is_stale: isStale,
          missing_data: []
        })

        return {
          ...account,
          vqs_benchmark: benchmarkMap[account.username],
          post_count: postCount,
          has_issues: hasIssues,
          is_stale: isStale,
          missing_data: missingData
        }
      })

      setAccounts(processedAccounts)
      setError(null)
    } catch (err) {
      console.error('Error fetching accounts data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts data')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial load
  useEffect(() => {
    fetchAccountsData()
  }, [fetchAccountsData])

  // Compute summary stats
  const dataSummary: DataQualitySummary = useMemo(() => {
    const accountsWithIssues = accounts.filter(acc => acc.has_issues).length
    const verticalCounts = accounts.reduce((acc, account) => {
      acc[account.vertical] = (acc[account.vertical] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const lastScrapeTimes = accounts
      .map(acc => acc.last_scraped_at)
      .filter(Boolean)
      .map(time => new Date(time!).getTime())
      .sort((a, b) => b - a)

    return {
      total_accounts: accounts.length,
      healthy_accounts: accounts.length - accountsWithIssues,
      accounts_with_issues: accountsWithIssues,
      last_full_scrape: lastScrapeTimes.length > 0 ? 
        new Date(lastScrapeTimes[0]).toISOString() : 
        null,
      accounts_by_vertical: verticalCounts
    }
  }, [accounts])

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesVertical = selectedVertical === 'all' || account.vertical === selectedVertical
      const matchesSearch = searchTerm === '' || 
        account.username.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesVertical && matchesSearch
    })
  }, [accounts, selectedVertical, searchTerm])

  // Get unique verticals for filter
  const verticals = useMemo(() => {
    const unique = Array.from(new Set(accounts.map(acc => acc.vertical)))
    return unique.sort()
  }, [accounts])

  const handleRefresh = async () => {
    setLoading(true)
    await fetchAccountsData()
  }

  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId)
  }

  if (loading && accounts.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
            <p className="text-muted-fg mt-2">
              Seed account health and VQS score monitoring
            </p>
          </div>

          {/* Loading Summary */}
          <div className="bg-card-bg border border-border rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-muted/20 rounded w-1/3 mb-4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-4 bg-muted/20 rounded w-2/3"></div>
                    <div className="h-8 bg-muted/20 rounded w-1/2"></div>
                    <div className="h-3 bg-muted/20 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Loading Accounts */}
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card-bg border border-border rounded-lg p-4">
                <div className="animate-pulse">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-6 bg-muted/20 rounded w-1/3"></div>
                        <div className="h-6 bg-muted/20 rounded-full w-20"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="h-4 bg-muted/20 rounded w-16"></div>
                        <div className="h-4 bg-muted/20 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-5 bg-muted/20 rounded w-5"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
            <p className="text-muted-fg mt-2">
              Seed account health and VQS score monitoring
            </p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-fg rounded-lg text-sm font-medium transition-colors"
          >
            <svg 
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Banner */}
        {error && accounts.length > 0 && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-red-300 text-sm">Refresh failed: {error}. Showing cached data.</p>
            <button onClick={handleRefresh} className="text-red-400 hover:text-red-300 text-sm font-medium ml-4">
              Retry
            </button>
          </div>
        )}

        {/* Error State - only when no data */}
        {error && accounts.length === 0 && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-5.898 6.5C4.372 11.833 5.334 13.5 6.874 13.5z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-300 mb-2">Failed to Load Account Data</h3>
                <p className="text-red-200 text-sm mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Summary - only show if we have data */}
        {accounts.length > 0 && (
          <div className="bg-card-bg border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Data Quality Summary</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-fg">Account Health</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-400">
                    {dataSummary.healthy_accounts}
                  </span>
                  <span className="text-sm text-muted-fg">healthy</span>
                </div>
                {dataSummary.accounts_with_issues > 0 && (
                  <p className="text-sm text-yellow-400">
                    {dataSummary.accounts_with_issues} with issues
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-fg">Total Accounts</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {dataSummary.total_accounts}
                  </span>
                  <span className="text-sm text-muted-fg">monitored</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-fg">Last Full Scrape</p>
                <div className="text-sm text-foreground">
                  {dataSummary.last_full_scrape ? 
                    new Date(dataSummary.last_full_scrape).toLocaleDateString() :
                    'Unknown'
                  }
                </div>
                <p className="text-xs text-muted-fg">
                  {dataSummary.last_full_scrape ? 
                    new Date(dataSummary.last_full_scrape).toLocaleTimeString() :
                    'No recent scrape data'
                  }
                </p>
              </div>
            </div>

            {/* Vertical breakdown */}
            <div className="space-y-2">
              <p className="text-sm text-muted-fg">Accounts by Vertical</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dataSummary.accounts_by_vertical).map(([vertical, count]) => (
                  <div key={vertical} className="px-3 py-1 bg-muted/10 text-muted-fg text-sm rounded-full">
                    {vertical}: {count}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {accounts.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-card-bg border border-border rounded-lg text-foreground placeholder-muted-fg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div className="sm:w-48">
              <select
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                className="w-full px-4 py-2 bg-card-bg border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Verticals</option>
                {verticals.map(vertical => (
                  <option key={vertical} value={vertical}>{vertical}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Account List */}
        {accounts.length === 0 && !loading && !error && (
          <div className="bg-card-bg border border-border rounded-lg p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-20 w-20 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-muted-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              
              <h3 className="text-xl font-bold text-foreground mb-2">No Accounts Found</h3>
              
              <p className="text-muted-fg mb-6">
                No seed accounts are currently available. Check your database connection and ensure accounts have been scraped.
              </p>
            </div>
          </div>
        )}

        {filteredAccounts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Seed Accounts</h2>
              <div className="text-sm text-muted-fg">
                Showing {filteredAccounts.length} of {accounts.length} accounts
              </div>
            </div>

            {filteredAccounts.map((account) => (
              <AccountCard 
                key={account.id}
                account={account}
                isExpanded={expandedAccount === account.id}
                onToggleExpansion={() => toggleAccountExpansion(account.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

// Account Card Component
interface AccountCardProps {
  account: AccountWithVQS
  isExpanded: boolean
  onToggleExpansion: () => void
}

function AccountCard({ account, isExpanded, onToggleExpansion }: AccountCardProps) {
  const vqsScore = account.vqs_benchmark?.vqs_score
  const vqsLevel: VQSScoreLevel | null = vqsScore !== undefined ? getVQSScoreLevel(vqsScore) : null
  const vqsColorClass = vqsScore !== undefined ? getVQSColorClass(vqsScore) : 'text-muted-fg bg-muted/10 border-border'

  return (
    <div className="bg-card-bg border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Main account info */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground truncate">
              @{account.username}
            </h3>
            
            <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full">
              {account.vertical}
            </span>

            {account.verified && (
              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
              </svg>
            )}

            {/* Warning badge for issues */}
            {account.has_issues && (
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0l-5.898 6.5C4.372 11.833 5.334 13.5 6.874 13.5z" />
                </svg>
                Issues
              </div>
            )}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-fg">Followers:</span>
              <span className="ml-2 text-foreground font-medium">
                {account.follower_count?.toLocaleString() || 'N/A'}
              </span>
            </div>
            
            <div>
              <span className="text-muted-fg">Posts:</span>
              <span className="ml-2 text-foreground font-medium">
                {account.post_count.toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-muted-fg">Last Scraped:</span>
              <span className="ml-2 text-foreground font-medium">
                {account.last_scraped_at ? 
                  new Date(account.last_scraped_at).toLocaleDateString() :
                  'Never'
                }
              </span>
            </div>

            {/* VQS Score */}
            <div className="flex items-center gap-2">
              <span className="text-muted-fg">VQS:</span>
              {vqsScore !== undefined ? (
                <span className={`px-2 py-1 rounded text-sm font-medium border ${vqsColorClass}`}>
                  {vqsScore}
                </span>
              ) : (
                <span className="text-muted-fg text-sm">No data</span>
              )}
            </div>
          </div>

          {/* Issues preview */}
          {account.has_issues && account.missing_data.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {account.missing_data.slice(0, 2).map((issue, idx) => (
                <span key={idx} className="px-2 py-1 bg-yellow-400/10 text-yellow-400 text-xs rounded">
                  {issue}
                </span>
              ))}
              {account.missing_data.length > 2 && (
                <span className="text-yellow-400 text-xs">
                  +{account.missing_data.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={onToggleExpansion}
          aria-expanded={isExpanded}
          className="flex-shrink-0 p-1 text-muted-fg hover:text-foreground transition-colors"
        >
          <svg 
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {/* VQS Breakdown */}
          {account.vqs_benchmark ? (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">VQS Score Breakdown</h4>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Engagement', value: account.vqs_benchmark.engagement_rate_median },
                  { label: 'Consistency', value: account.vqs_benchmark.posting_consistency },
                  { label: 'Diversity', value: account.vqs_benchmark.content_diversity },
                  { label: 'Followers', value: account.vqs_benchmark.follower_score },
                  { label: 'Growth', value: account.vqs_benchmark.growth_score },
                  { label: 'Recency', value: account.vqs_benchmark.recency_score }
                ].map((metric) => (
                  <div key={metric.label} className="flex justify-between">
                    <span className="text-muted-fg">{metric.label}:</span>
                    <span className="text-foreground font-medium">
                      {metric.value !== null && metric.value !== undefined ? 
                        (typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value) :
                        'N/A'
                      }
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-2 text-xs text-muted-fg">
                Calculated: {account.vqs_benchmark.calculated_at ? 
                  new Date(account.vqs_benchmark.calculated_at).toLocaleString() :
                  'Unknown'
                }
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-fg">
              No VQS data available for this account.
            </div>
          )}

          {/* Additional account details */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Account Details</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-fg">Business Category:</span>
                <span className="ml-2 text-foreground">
                  {account.business_category_name || 'N/A'}
                </span>
              </div>
              
              <div>
                <span className="text-muted-fg">Business Account:</span>
                <span className="ml-2 text-foreground">
                  {account.is_business_account ? 'Yes' : 'No'}
                </span>
              </div>

              <div>
                <span className="text-muted-fg">Following:</span>
                <span className="ml-2 text-foreground">
                  {account.follows_count?.toLocaleString() || 'N/A'}
                </span>
              </div>

              {account.biography && (
                <div>
                  <span className="text-muted-fg">Bio:</span>
                  <div className="mt-1 text-foreground italic">
                    &ldquo;{account.biography}&rdquo;
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* All issues */}
          {account.has_issues && account.missing_data.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-2">Data Issues</h4>
              <div className="flex flex-wrap gap-2">
                {account.missing_data.map((issue, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-400/10 text-red-400 text-xs rounded border border-red-400/20">
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}