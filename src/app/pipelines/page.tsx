import { AppLayout } from '@/components/AppLayout'
import { PipelineDashboard } from '@/components/pipelines/PipelineDashboard'

export default function PipelinesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pipelines</h1>
          <p className="text-muted-fg mt-2">
            Monitor batch pipeline run history and health across vibeyap operations
          </p>
        </div>

        <PipelineDashboard />
      </div>
    </AppLayout>
  )
}