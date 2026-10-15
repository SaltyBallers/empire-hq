'use client'

import { AppLayout } from '@/components/AppLayout'
import { SurfballersDashboard } from '@/components/surfballers/SurfballersDashboard'

export default function SurfballersPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Surfballers</h1>
          <p className="text-muted-fg mt-2">
            AI assistant usage analytics — cost, tool usage, and intent breakdown
          </p>
        </div>

        <SurfballersDashboard />
      </div>
    </AppLayout>
  )
}
