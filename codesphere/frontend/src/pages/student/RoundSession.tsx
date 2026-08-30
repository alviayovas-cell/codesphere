import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCountdown } from '../../hooks/useCountdown'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { RoundSessionPublic } from '../../types'
import Button from '../../components/ui/Button'
import { DifficultyBadge, SessionStatusBadge } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ErrorState, { InlineError } from '../../components/ui/ErrorState'
import { PageSpinner } from '../../components/ui/Spinner'
import Timer from '../../components/coding/Timer'
import QuestionNavigator from '../../components/coding/QuestionNavigator'
import { ChevronLeftIcon } from '../../components/ui/Icons'

export default function RoundSession() {
  const { roundId } = useParams<{ roundId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<RoundSessionPublic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(() => {
    if (!roundId) return
    api
      .getRoundSession(roundId)
      .then(setSession)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load this round.'))
  }, [roundId])

  useEffect(() => {
    load()
  }, [load])

  const remaining = useCountdown(session?.remainingSeconds ?? 0)

  // Resync with the server periodically and once the local countdown hits 0
  // (the server is the timing authority - this just refreshes status/lock
  // state, e.g. after expiry).
  useEffect(() => {
    if (!session || session.status !== 'active') return
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [session, load])

  useEffect(() => {
    if (session?.status === 'active' && remaining === 0) {
      load()
    }
  }, [remaining, session, load])

  async function handleFinish() {
    if (!roundId) return
    setFinishing(true)
    setError(null)
    try {
      const updated = await api.finishRound(roundId)
      setSession(updated)
      setConfirmOpen(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the round.')
    } finally {
      setFinishing(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorState message={error} onRetry={load} />
        <Link to="/student/rounds" className="mt-4 inline-block text-sm text-zinc-500 underline dark:text-zinc-400">
          Back to rounds
        </Link>
      </div>
    )
  }

  if (!session) return <PageSpinner />

  const isActive = session.status === 'active'
  const orderedQuestions = [...session.assignedQuestions].sort((a, b) => a.order - b.order)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button
        type="button"
        onClick={() => navigate('/student/rounds')}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ChevronLeftIcon className="h-4 w-4" /> Back to rounds
      </button>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">Coding Round</h1>
          <SessionStatusBadge status={session.status} />
        </div>
        {isActive && <Timer seconds={remaining} className="text-base" />}
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {orderedQuestions.length} question{orderedQuestions.length === 1 ? '' : 's'}
      </p>

      {!isActive && (
        <div className="mt-4">
          <InlineError
            message={
              (session.status === 'submitted' && 'You have submitted this round.') ||
              (session.status === 'expired' && 'Time expired for this round.') ||
              (session.status === 'locked' && 'This session has been locked.') ||
              ''
            }
          />
        </div>
      )}

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Jump to</p>
        <div className="mt-2">
          <QuestionNavigator
            count={orderedQuestions.length}
            current={-1}
            states={orderedQuestions.map(() => 'not_attempted')}
            onSelect={(i) => navigate(`/student/rounds/${roundId}/problems/${orderedQuestions[i].problemId}`)}
          />
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {orderedQuestions.map((q) => (
          <li key={q.problemId}>
            <Link
              to={`/student/rounds/${roundId}/problems/${q.problemId}`}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-3.5 transition-colors hover:border-primary-300 dark:border-zinc-800 dark:hover:border-primary-800"
            >
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Question {q.order}</span>
              <DifficultyBadge difficulty={q.difficulty} />
            </Link>
          </li>
        ))}
      </ul>

      {isActive && (
        <Button variant="danger" onClick={() => setConfirmOpen(true)} className="mt-6">
          Finish Round
        </Button>
      )}

      {!isActive && (
        <Button variant="secondary" onClick={() => navigate('/student/results')} className="mt-6">
          View Results
        </Button>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Finish this round?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={finishing} onClick={handleFinish}>
              Finish Round
            </Button>
          </>
        }
      >
        Once you finish, this session is locked and you won't be able to submit any more code for this round. Make
        sure you've submitted your best solution for each question first.
      </Modal>
    </div>
  )
}
