import PageHeader from '../../components/layout/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { ChartIcon } from '../../components/ui/Icons'

export default function Analytics() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Analytics" description="Submission trends, question performance, and weak-topic detection." />
      <div className="mt-6">
        <EmptyState
          icon={<ChartIcon className="h-6 w-6" />}
          title="Analytics is coming soon."
          description="Meaningful charts will appear here once enough submission data and reporting endpoints exist."
        />
      </div>
    </div>
  )
}
