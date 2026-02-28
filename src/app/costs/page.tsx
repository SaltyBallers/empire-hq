import { AppLayout } from '@/components/AppLayout'

export default function CostsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Costs</h1>
          <p className="text-muted-fg mt-2">
            Track expenses and resource usage across all services
          </p>
        </div>

        <div className="bg-card-bg border border-border rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">Coming Soon</h2>
            
            <p className="text-muted-fg mb-6">
              The Cost Dashboard will provide comprehensive tracking of all expenses, 
              resource usage, and budget analysis across the entire Empire.
            </p>

            <div className="flex flex-col space-y-2 text-sm text-muted-fg">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Vercel usage tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Supabase resource monitoring</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Domain and service costs</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Budget alerts and forecasting</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}