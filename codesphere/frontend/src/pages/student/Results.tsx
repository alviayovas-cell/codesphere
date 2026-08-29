import PageHeader from '../../components/layout/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { ChartIcon } from '../../components/ui/Icons'

export default function Results() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Results" description="Your coding round scores and performance breakdown." />
      <div className="mt-6">
        <EmptyState
          icon={<ChartIcon className="h-6 w-6" />}
          title="Detailed results are coming soon."
          description="A full breakdown of your coding round performance will appear here."
        />
      </div>
    </div>
  )
}
