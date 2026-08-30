import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { AnalyticsOverview } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import StatCard from '../../components/dashboard/StatCard'
import { DifficultyBadge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import { InlineError } from '../../components/ui/ErrorState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import SubmissionTrendChart from '../../components/charts/SubmissionTrendChart'
import RankedBarList from '../../components/charts/RankedBarList'
import { ChartIcon, ClockIcon, CodeIcon, TrophyIcon, UsersIcon } from '../../components/ui/Icons'

const difficultyBarClass: Record<string, string> = {
  easy: 'bg-green-500 dark:bg-green-400',
  medium: 'bg-amber-500 dark:bg-amber-400',
  hard: 'bg-red-500 dark:bg-red-400',
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    api
      .getAnalytics()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load analytics.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Analytics" description="Submission trends, question performance, and learning engagement." />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {data === null && !error && (
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonCard />
        </div>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Students" value={data.overview.totalStudents} icon={UsersIcon} accent="primary" />
            <StatCard
              label="Problems attempted"
              value={`${data.overview.problemsAttempted}/${data.overview.totalProblems}`}
              icon={CodeIcon}
              accent="secondary"
            />
            <StatCard label="Submissions" value={data.overview.totalSubmissions} icon={ChartIcon} accent="primary" />
            <StatCard label="Overall pass rate" value={`${data.overview.overallPassRate}%`} icon={TrophyIcon} accent="success" />
            <StatCard
              label="Active rounds"
              value={`${data.overview.activeRounds}/${data.overview.totalRounds}`}
              icon={ClockIcon}
              accent="warning"
            />
          </div>

          <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Submissions - last 14 days</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Every graded Run/Submit attempt, accepted vs. everything else.</p>
            <div className="mt-3">
              {data.submissionTrend.every((p) => p.accepted + p.other === 0) ? (
                <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No submissions in the last 14 days.</p>
              ) : (
                <SubmissionTrendChart points={data.submissionTrend} />
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Pass rate by difficulty</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Across every attempted problem, grouped by difficulty.</p>
              <div className="mt-4">
                <RankedBarList
                  max={100}
                  items={data.difficultyBreakdown.map((d) => ({
                    key: d.difficulty,
                    label: d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1),
                    value: d.passRate,
                    detail: `(${d.accepted}/${d.attempts})`,
                    tooltip: `${d.accepted} accepted out of ${d.attempts} attempts`,
                    barClassName: difficultyBarClass[d.difficulty],
                  }))}
                  formatValue={(v) => `${v}%`}
                  emptyMessage="No graded submissions yet."
                />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Learning module engagement</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Average topic-completion across all students, least-engaged first.</p>
              <div className="mt-4">
                <RankedBarList
                  max={100}
                  items={data.learningEngagement.map((m) => ({
                    key: m.moduleId,
                    label: m.title,
                    value: m.avgCompletionPercent,
                    tooltip: `${m.studentsStarted} student(s) started this module (${m.totalTopics} topics)`,
                  }))}
                  formatValue={(v) => `${v}%`}
                  emptyMessage="No learning modules yet."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Weakest topics</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Pass rate by problem topic, lowest first - a platform-wide signal, not a per-student diagnostic.
            </p>
            <div className="mt-4">
              <RankedBarList
                max={100}
                items={data.topicBreakdown.map((t) => ({
                  key: t.topic,
                  label: t.topic,
                  value: t.passRate,
                  detail: `(${t.accepted}/${t.attempts})`,
                  tooltip: `${t.accepted} accepted out of ${t.attempts} attempts`,
                }))}
                formatValue={(v) => `${v}%`}
                emptyMessage="No graded submissions yet."
              />
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Problem performance</h2>
            <p className="mt-0.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Every attempted problem, most-struggled-with first.
            </p>
            {data.problemPerformance.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No graded submissions yet.</p>
            ) : (
              <Table>
                <Thead>
                  <Th>Problem</Th>
                  <Th>Difficulty</Th>
                  <Th>Topic</Th>
                  <Th>Attempts</Th>
                  <Th>Pass Rate</Th>
                  <Th>Avg Score</Th>
                </Thead>
                <Tbody>
                  {data.problemPerformance.map((p) => (
                    <Tr key={p.problemId}>
                      <Td className="font-medium text-zinc-900 dark:text-white">{p.title}</Td>
                      <Td>
                        <DifficultyBadge difficulty={p.difficulty} />
                      </Td>
                      <Td>{p.topic}</Td>
                      <Td>
                        {p.accepted}/{p.attempts}
                      </Td>
                      <Td>{p.passRate}%</Td>
                      <Td>{p.avgScore}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
