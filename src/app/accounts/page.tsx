import { AppLayout } from '@/components/AppLayout'

export default function AccountsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-fg mt-2">
            User management and access control across platforms
          </p>
        </div>

        <div className="bg-card-bg border border-border rounded-lg p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-4">Coming Soon</h2>
            
            <p className="text-muted-fg mb-6">
              The Accounts Dashboard will provide centralized user management, 
              role assignments, and access control across all Empire ventures.
            </p>

            <div className="flex flex-col space-y-2 text-sm text-muted-fg">
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Cross-platform user directory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Role-based access control</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Session management</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 bg-primary rounded-full"></div>
                <span>Activity monitoring</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}