import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { CodingRoundSummary } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import { AlertIcon, ClockIcon } from '../../components/ui/Icons'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function statusInfo(round: CodingRoundSummary): { text: string; action: 'start' | 'continue' | 'view' | 'wait' | 'over' } {
  if (round.studentStatus === 'active') return { text: 'In progress', action: 'continue' }
  if (round.studentStatus === 'submitted') return { text: 'Submitted', action: 'view' }
  if (round.studentStatus === 'expired' || round.studentStatus === 'locked') return { text: 'Time expired', action: 'view' }
  if (round.hasEnded) return { text: 'Round ended', action: 'over' }
  if (!round.hasStartedWindow) return { text: `Starts ${formatDate(round.startTime)}`, action: 'wait' }
  return { text: 'Open now', action: 'start' }
}

export default function Rounds() {
  const navigate = useNavigate()
  const [rounds, setRounds] = useState<CodingRoundSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [pendingStart, setPendingStart] = useState<CodingRoundSummary | null>(null)

  const load = useCallback(() => {
    setError(null)
    api
      .getRounds()
      .then(setRounds)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load coding rounds.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleStart(roundId: string) {
    setError(null)
    setStartingId(roundId)
    try {
      await api.startRound(roundId)
      navigate(`/student/rounds/${roundId}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the round.')
    } finally {
      setStartingId(null)
      setPendingStart(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Coding Rounds" description="Timed assessments assigned by your coordinator." />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {rounds === null && !error && (
        <div className="mt-6 flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {rounds !== null && rounds.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<ClockIcon className="h-6 w-6" />}
            title="No coding rounds available right now."
            action={
              <Button variant="secondary" onClick={() => navigate('/student/problems')}>
                Practice Problems
              </Button>
            }
          />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {rounds?.map((round) => {
          const { text, action } = statusInfo(round)
          return (
            <div key={round.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{round.title}</h2>
                <Badge variant={action === 'continue' ? 'success' : action === 'wait' ? 'warning' : 'neutral'}>{text}</Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{round.description}</p>
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                {round.questionCount} question{round.questionCount === 1 ? '' : 's'} &middot; {round.totalMarks} marks
                &middot; {round.durationMinutes} min &middot; window {formatDate(round.startTime)} &ndash; {formatDate(round.endTime)}
              </p>

              <div className="mt-3">
                {action === 'start' && (
                  <Button variant="primary" size="sm" loading={startingId === round.id} onClick={() => setPendingStart(round)}>
                    Start Round
                  </Button>
                )}
                {action === 'continue' && (
                  <Button variant="primary" size="sm" onClick={() => navigate(`/student/rounds/${round.id}`)}>
                    Continue
                  </Button>
                )}
                {action === 'view' && (
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/student/rounds/${round.id}`)}>
                    View
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={pendingStart !== null}
        onClose={() => (startingId ? undefined : setPendingStart(null))}
        title="Before you start"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingStart(null)} disabled={startingId !== null}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={startingId === pendingStart?.id}
              onClick={() => pendingStart && handleStart(pendingStart.id)}
            >
              Start Round
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <AlertIcon className="h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p>
              <span className="font-semibold text-zinc-900 dark:text-white">{pendingStart?.title}</span> is a timed,
              monitored assessment. Once started, the {pendingStart?.durationMinutes}-minute timer cannot be paused
              or restarted.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Switching tabs, minimizing the window, or losing focus is recorded as a violation.</li>
              <li>Exceeding the allowed number of violations will automatically submit your answers and lock the round.</li>
              <li>Your code is saved automatically as you work, so a brief disconnect won't lose your progress.</li>
            </ul>
            <p className="mt-2">Make sure you're ready and won't be interrupted before you continue.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
