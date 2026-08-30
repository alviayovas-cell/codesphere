import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { CodingRoundSummary, LeaderboardResponse } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import { Select } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { cn } from '../../lib/cn'
import { TrophyIcon } from '../../components/ui/Icons'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Leaderboard() {
  const [rounds, setRounds] = useState<CodingRoundSummary[] | null>(null)
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getRounds()
      .then((r) => {
        setRounds(r)
        if (r.length > 0) setSelectedRoundId((current) => current || r[0].id)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load rounds.'))
  }, [])

  const loadLeaderboard = useCallback((roundId: string) => {
    if (!roundId) return
    setError(null)
    setLeaderboard(null)
    api
      .getRoundLeaderboard(roundId)
      .then(setLeaderboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load the leaderboard.'))
  }, [])

  useEffect(() => {
    if (selectedRoundId) loadLeaderboard(selectedRoundId)
  }, [selectedRoundId, loadLeaderboard])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Leaderboard" description="See how you rank against other students." />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {rounds === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={4} />
        </div>
      )}

      {rounds !== null && rounds.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<TrophyIcon className="h-6 w-6" />}
            title="No coding rounds yet."
            description="Rankings will appear here once coding rounds are available."
          />
        </div>
      )}

      {rounds !== null && rounds.length > 0 && (
        <>
          <div className="mt-5 w-full max-w-xs">
            <Select
              label="Round"
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              aria-label="Select round"
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4">
            {leaderboard === null ? (
              <SkeletonText lines={4} />
            ) : !leaderboard.resultsAvailable ? (
              <EmptyState
                icon={<TrophyIcon className="h-6 w-6" />}
                title="Leaderboard not available yet."
                description="Rankings are revealed once this round's time window has closed for everyone."
              />
            ) : leaderboard.entries.length === 0 ? (
              <EmptyState icon={<TrophyIcon className="h-6 w-6" />} title="No one has completed this round yet." />
            ) : (
              <Table>
                <Thead>
                  <Th>Rank</Th>
                  <Th>Student</Th>
                  <Th>Score</Th>
                  <Th>Completed</Th>
                </Thead>
                <Tbody>
                  {leaderboard.entries.map((entry) => (
                    <Tr
                      key={entry.studentId}
                      className={cn(entry.isYou && 'bg-primary-50/60 dark:bg-primary-950/40')}
                    >
                      <Td className="font-semibold text-zinc-900 dark:text-white">
                        {entry.rank <= 3 ? (
                          <Badge variant={entry.rank === 1 ? 'warning' : 'neutral'}>#{entry.rank}</Badge>
                        ) : (
                          entry.rank
                        )}
                      </Td>
                      <Td className="font-medium text-zinc-900 dark:text-white">
                        {entry.studentName}
                        {entry.isYou && (
                          <span className="ml-1.5 text-xs font-normal text-primary-600 dark:text-primary-400">(you)</span>
                        )}
                      </Td>
                      <Td>
                        {entry.score} / {entry.totalMarks}
                      </Td>
                      <Td className="text-zinc-500 dark:text-zinc-400">{formatDateTime(entry.completedAt)}</Td>
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
