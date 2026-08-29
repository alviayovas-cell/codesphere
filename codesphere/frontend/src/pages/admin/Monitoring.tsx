import PageHeader from '../../components/layout/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { MonitorIcon } from '../../components/ui/Icons'

export default function Monitoring() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Assessment Monitoring" description="Track active sessions and visibility/focus violations during coding rounds." />
      <div className="mt-6">
        <EmptyState
          icon={<MonitorIcon className="h-6 w-6" />}
          title="Monitoring is coming soon."
          description="Live session tracking and violation logs will appear here once assessment monitoring is built."
        />
      </div>
    </div>
  )
}
