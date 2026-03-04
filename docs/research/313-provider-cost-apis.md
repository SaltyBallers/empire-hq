# Provider Cost API Research — Card #313

## Summary

| Provider | Has Usage API? | Endpoint | Auth | Notes |
|----------|---------------|----------|------|-------|
| Anthropic | ✅ Yes | `GET /v1/organizations/{org_id}/usage` | API key + Admin key | Returns token counts by model per day. Beta API. |
| OpenAI | ✅ Yes | `GET /v1/organization/usage/completions` | Admin API key | Returns usage buckets with token counts & costs |
| Brave | ❌ No public API | N/A | N/A | Dashboard only at api.search.brave.com. Manual entry needed. |
| Exa | ❌ No public API | N/A | N/A | Dashboard at dashboard.exa.ai. Manual entry needed. |
| Perplexity | ❌ No public API | N/A | N/A | No usage API documented. Manual entry needed. |
| Kimi/Moonshot | ❌ No public API | N/A | N/A | No billing API found. Manual entry needed. |
| Gemini/Google | ✅ Partial | Cloud Billing API | Service account | Complex — requires Cloud Billing setup. Manual for AI Studio. |
| Lovable | ❌ No API | N/A | N/A | Credit-based, dashboard only. Manual entry needed. |
| Vercel | ✅ Yes | `GET /v1/usage` | Bearer token | Returns bandwidth, builds, serverless usage |
| Supabase | ✅ Yes | `GET /v1/projects/{ref}/usage` | Management API key | Returns DB size, edge function invocations, bandwidth |
| Apify | ✅ Yes | Already integrated | API token | Already in `admin_api_costs` table |

## Approach

Given that many providers lack usage APIs, the costs dashboard will:
1. Continue reading from `admin_api_costs` Supabase table for all providers
2. Expand the provider list to include all 11 providers
3. Support manual cost entry for providers without APIs
4. Provider-specific API fetching can be added incrementally as Edge Functions

## Provider Details

### Anthropic
- Docs: https://docs.anthropic.com/en/api/usage
- `GET /v1/organizations/{org_id}/usage` with date range params
- Returns: input_tokens, output_tokens, cost by model
- Auth: `x-api-key` header with admin API key

### OpenAI
- Docs: https://platform.openai.com/docs/api-reference/usage
- `GET /v1/organization/usage/completions?date=YYYY-MM-DD`
- Returns: token counts, cost buckets by model
- Auth: Admin API key in Authorization header

### Vercel
- Docs: https://vercel.com/docs/rest-api/endpoints/usage
- Multiple endpoints for different usage types
- Auth: Bearer token

### Supabase
- Management API: https://supabase.com/docs/reference/api
- `GET /v1/projects/{ref}/usage`
- Auth: Management API key (different from anon/service key)

### Manual Entry Providers
Brave, Exa, Perplexity, Kimi/Moonshot, Gemini, Lovable — will use manual entry with the existing `admin_api_costs` table structure.
