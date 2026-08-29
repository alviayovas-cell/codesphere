import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services/api'
import type { CodingRoundSummary, LearningModule, ProblemSummary, ProgressSummary } from '../../types'
import Button from '../../components/ui/Button'
import ProgressCard from '../../components/dashboard/ProgressCard'
import StatCard from '../../components/dashboard/StatCard'
import ActivityItem from '../../components/dashboard/ActivityItem'
import { SkeletonCard, SkeletonStatRow, SkeletonText } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'
import { BookIcon, ClockIcon, CodeIcon, FlameIcon, TrophyIcon } from '../../components/ui/Icons'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [modules, setModules] = useState<LearningModule[] | null>(null)
  const [rounds, setRounds] = useState<CodingRoundSummary[] | null>(null)
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)

  useEffect(() => {
    api.getProgress().then(setProgress).catch(() => setProgress(null))
    api.getModules().then(setModules).catch(() => setModules(null))
    api.getRounds().then(setRounds).catch(() => setRounds(null))
    api.getProblems().then(setProblems).catch(() => setProblems(null))
  }, [])

  const percent =
    progress && progress.totalTopics > 0 ? Math.round((progress.completedTopics / progress.totalTopics) * 100) : 0

  const nextTopics =
    modules
      ?.flatMap((module) => module.topics.map((topic) => ({ module, topic })))
      .filter(({ topic }) => !topic.completed)
      .slice(0, 2) ?? []

  const upcomingRounds = rounds?.filter((r) => !r.hasEnded).slice(0, 3) ?? []

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white sm:text-2xl">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {user?.registerNumber} &middot; {user?.class}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/student/problems">
            <Button variant="secondary">Practice Coding</Button>
          </Link>
          <Link to={nextTopics[0] ? `/student/learning/topics/${nextTopics[0].topic.id}` : '/student/learning'}>
            <Button variant="primary">Continue Learning</Button>
          </Link>
        </div>
      </div>

      {/* Quick stats */}
      <section className="mt-6">
        {progress === null && modules === null ? (
          <SkeletonStatRow />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Topics Completed" value={progress?.completedTopics ?? 0} icon={BookIcon} accent="primary" />
            <StatCard
              label="Learning Progress"
              value={`${percent}%`}
              icon={FlameIcon}
              accent="warning"
            />
            <StatCard
              label="Upcoming Rounds"
              value={rounds?.filter((r) => !r.hasEnded).length ?? 0}
              icon={ClockIcon}
              accent="secondary"
            />
            <StatCard label="Problems Available" value={problems?.length ?? '—'} icon={CodeIcon} accent="success" />
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {/* Learning progress */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Learning Progress</h2>
            <div className="mt-3">
              {progress ? (
                <ProgressCard title="C Programming" completed={progress.completedTopics} total={progress.totalTopics} />
              ) : (
                <SkeletonCard />
              )}
            </div>
          </section>

          {/* Continue learning */}
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Continue Learning</h2>
              <Link to="/student/learning" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
                View all modules
              </Link>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {modules === null ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : nextTopics.length > 0 ? (
                nextTopics.map(({ module, topic }) => (
                  <Link
                    key={topic.id}
                    to={`/student/learning/topics/${topic.id}`}
                    className="group rounded-lg border border-zinc-200 p-4 transition-colors hover:border-primary-300 dark:border-zinc-800 dark:hover:border-primary-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
                        <BookIcon className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{module.title}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-zinc-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-400">
                      {topic.title}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="sm:col-span-2">
                  <EmptyState title="You've completed every available topic." description="Nice work — check the problem bank for more practice." />
                </div>
              )}
            </div>
          </section>

          {/* Upcoming coding rounds */}
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Upcoming Coding Rounds</h2>
              <Link to="/student/rounds" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
                View all
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {rounds === null ? (
                <SkeletonText lines={2} />
              ) : upcomingRounds.length === 0 ? (
                <EmptyState title="No coding rounds available right now." action={
                  <Link to="/student/problems"><Button size="sm" variant="secondary">Practice Problems</Button></Link>
                } />
              ) : (
                upcomingRounds.map((r) => (
                  <Link
                    key={r.id}
                    to={r.studentStatus ? `/student/rounds/${r.id}` : '/student/rounds'}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 p-3.5 transition-colors hover:border-primary-300 dark:border-zinc-800 dark:hover:border-primary-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{r.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {r.questionCount} questions &middot; {r.durationMinutes} min
                      </p>
                    </div>
                    {r.studentStatus === 'active' && <Badge variant="success">In progress</Badge>}
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Recent activity */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Recent Activity</h2>
          <div className="mt-3 rounded-lg border border-zinc-200 px-4 dark:border-zinc-800">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {progress && progress.completedTopics > 0 ? (
                <ActivityItem
                  icon={TrophyIcon}
                  accent="success"
                  title={<>Completed <strong>{progress.completedTopics}</strong> learning topic{progress.completedTopics === 1 ? '' : 's'} so far</>}
                />
              ) : null}
              {rounds?.some((r) => r.studentStatus) ? (
                <ActivityItem
                  icon={ClockIcon}
                  accent="primary"
                  title="You have an active or completed coding round"
                />
              ) : null}
              {(!progress || progress.completedTopics === 0) && !rounds?.some((r) => r.studentStatus) && (
                <li className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
                  Nothing yet — start a lesson or a problem to see activity here.
                </li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
