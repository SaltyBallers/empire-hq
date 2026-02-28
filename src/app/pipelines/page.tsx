import { AppLayout } from '@/components/AppLayout'

export default function PipelinesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipelines</h1>
          <p className="text-muted-fg mt-2">
            Monitor and manage deployment pipelines across all ventures
          </p>
        </div>

        <div className="bg-card-bg border border-border rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">Coming Soon</h2>
            
            <p className="text-muted-fg mb-6">
              The Pipeline Dashboard will provide real-time monitoring of all deployment 
              pipelines, build statuses, and automated workflows across the Empire.
            </p>

            <div className="flex flex-col space-y-2 text-sm text-muted-fg">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>GitHub Actions integration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Vercel deployment tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Supabase Edge Function monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Build failure alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}