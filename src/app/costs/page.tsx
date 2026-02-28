'use client'

import { AppLayout } from '@/components/AppLayout'
import { CostsDashboard } from '@/components/costs/CostsDashboard'

export default function CostsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Costs</h1>
          <p className="text-muted-fg mt-2">
            Track API spend and resource usage across all providers
          </p>
        </div>

        <CostsDashboard />
      </div>
    </AppLayout>
  )
}