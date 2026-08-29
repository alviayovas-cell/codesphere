import PageHeader from '../../components/layout/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { TrophyIcon } from '../../components/ui/Icons'

export default function Leaderboard() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Leaderboard" description="See how you rank against other students." />
      <div className="mt-6">
        <EmptyState
          icon={<TrophyIcon className="h-6 w-6" />}
          title="Leaderboard is coming soon."
          description="Rankings will appear here once coding round results are available."
        />
      </div>
    </div>
  )
}
