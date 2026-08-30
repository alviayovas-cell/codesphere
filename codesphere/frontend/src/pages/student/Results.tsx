import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { RoundResultDetail, RoundResultSummary } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Badge, DifficultyBadge, SessionStatusBadge, VerdictBadge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { ChartIcon } from '../../components/ui/Icons'

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Results() {
  const [results, setResults] = useState<RoundResultSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [detailRoundId, setDetailRoundId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RoundResultDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    api
      .getMyResults()
      .then(setResults)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load your results.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openDetail(roundId: string) {
    setDetailRoundId(roundId)
    setDetail(null)
    setDetailError(null)
    try {
      const d = await api.getMyRoundResult(roundId)
      setDetail(d)
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : 'Failed to load result details.')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Results" description="Your coding round scores and performance breakdown." />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {results === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={4} />
        </div>
      )}

      {results !== null && results.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<ChartIcon className="h-6 w-6" />}
            title="No results yet."
            description="Complete a coding round to see your score and performance breakdown here."
          />
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div className="mt-6">
          <Table>
            <Thead>
              <Th>Round</Th>
              <Th>Status</Th>
              <Th>Score</Th>
              <Th>Rank</Th>
              <Th>Completed</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
              {results.map((r) => (
                <Tr key={r.roundId}>
                  <Td className="font-medium text-zinc-900 dark:text-white">{r.roundTitle}</Td>
                  <Td>
                    <SessionStatusBadge status={r.status} />
                  </Td>
                  <Td>
                    {r.resultsAvailable ? (
                      <span>
                        {r.score} / {r.totalMarks}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">Pending</span>
                    )}
                  </Td>
                  <Td>
                    {r.resultsAvailable && r.rank ? (
                      <span>
                        {r.rank} / {r.totalParticipants}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">—</span>
                    )}
                  </Td>
                  <Td>{formatDateTime(r.completedAt)}</Td>
                  <Td className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(r.roundId)}>
                      View Breakdown
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      <Modal
        open={detailRoundId !== null}
        onClose={() => setDetailRoundId(null)}
        title={detail ? detail.roundTitle : 'Result breakdown'}
        footer={<Button variant="primary" onClick={() => setDetailRoundId(null)}>Close</Button>}
      >
        {detailError && <InlineError message={detailError} />}
        {!detailError && detail === null && <SkeletonText lines={3} />}
        {!detailError && detail !== null && !detail.resultsAvailable && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Results for this round aren't available yet — check back once the round has ended.
          </p>
        )}
        {!detailError && detail !== null && detail.resultsAvailable && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-zinc-900 dark:text-white">
                {detail.score} / {detail.totalMarks} marks
              </span>
              {detail.rank && (
                <Badge variant="primary">
                  Rank {detail.rank} of {detail.totalParticipants}
                </Badge>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Question</th>
                    <th className="px-2 py-1.5 font-medium">Verdict</th>
                    <th className="px-2 py-1.5 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {detail.questions?.map((q) => (
                    <tr key={q.problemId}>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {q.title}
                          <DifficultyBadge difficulty={q.difficulty} />
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        {q.verdict ? <VerdictBadge verdict={q.verdict} /> : <span className="text-zinc-400 dark:text-zinc-500">Not attempted</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        {q.score} / {q.marks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
