// Seed account types from vibeyap Supabase
export interface SeedAccount {
  id: string
  username: string
  vertical: string
  follower_count: number | null
  biography: string | null
  business_category_name: string | null
  is_business_account: boolean
  verified: boolean
  posts_count: number | null
  follows_count: number | null
  last_scraped_at: string | null
  raw_profile_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// VQS benchmark data (may be empty)
export interface VQSBenchmark {
  id: string
  vertical: string
  account_username: string
  vqs_score: number
  engagement_rate_median: number | null
  posting_consistency: number | null
  content_diversity: number | null
  follower_score: number | null
  growth_score: number | null
  recency_score: number | null
  calculated_at: string
}

// Seed account posts for post count
export interface SeedAccountPost {
  id: string
  seed_account_id: string
  shortcode: string
  caption: string | null
  likes_count: number | null
  comments_count: number | null
  media_type: string | null
  posted_at: string | null
  scraped_at: string
}

// Computed types for dashboard
export interface AccountWithVQS extends SeedAccount {
  vqs_benchmark?: VQSBenchmark
  post_count: number
  has_issues: boolean
  is_stale: boolean
  missing_data: string[]
}

export interface DataQualitySummary {
  total_accounts: number
  healthy_accounts: number
  accounts_with_issues: number
  last_full_scrape: string | null
  accounts_by_vertical: Record<string, number>
}

export type VQSScoreLevel = 'high' | 'medium' | 'low'

export function getVQSScoreLevel(score: number): VQSScoreLevel {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

export function getVQSColorClass(score: number): string {
  const level = getVQSScoreLevel(score)
  switch (level) {
    case 'high': return 'text-green-400 bg-green-400/10 border-green-400/20'
    case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'low': return 'text-red-400 bg-red-400/10 border-red-400/20'
  }
}

export function formatAccountIssues(account: AccountWithVQS): string[] {
  const issues: string[] = []
  
  if (account.follower_count === null) {
    issues.push('Missing follower count')
  }
  
  if (account.post_count === 0) {
    issues.push('No posts found')
  }
  
  if (account.is_stale) {
    issues.push('Stale data (>7 days)')
  }
  
  return issues
}