import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatCountdown, useCountdown } from '../../hooks/useCountdown'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { RoundSessionPublic } from '../../types'

const difficultyColor: Record<string, string> = {
  easy: 'text-green-600 dark:text-green-400',
  medium: 'text-amber-600 dark:text-amber-400',
  hard: 'text-red-600 dark:text-red-400',
}

export default function RoundSession() {
  const { roundId } = useParams<{ roundId: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<RoundSessionPublic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the round.')
    } finally {
      setFinishing(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-2xl px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link to="/student/rounds" className="mt-4 inline-block text-sm underline">
          Back to rounds
        </Link>
      </div>
    )
  }

  if (!session) {
    return <div className="mx-auto mt-16 max-w-2xl px-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  }

  const isActive = session.status === 'active'

  return (
    <div className="mx-auto mt-16 max-w-2xl px-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Coding Round</h1>
        {isActive && (
          <span className="rounded-md bg-gray-900 px-3 py-1.5 font-mono text-sm text-white dark:bg-white dark:text-gray-900">
            {formatCountdown(remaining)}
          </span>
        )}
      </div>

      {!isActive && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          {session.status === 'submitted' && 'You have submitted this round.'}
          {session.status === 'expired' && 'Time expired for this round.'}
          {session.status === 'locked' && 'This session has been locked.'}
        </p>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Questions
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {session.assignedQuestions.map((q) => (
          <li key={q.problemId} className="rounded-md border border-gray-200 p-3 dark:border-gray-800">
            <Link
              to={`/student/rounds/${roundId}/problems/${q.problemId}`}
              className="flex items-center justify-between text-sm text-gray-900 hover:underline dark:text-white"
            >
              <span>Question {q.order}</span>
              <span className={`capitalize ${difficultyColor[q.difficulty]}`}>{q.difficulty}</span>
            </Link>
          </li>
        ))}
      </ul>

      {isActive && (
        <button
          type="button"
          onClick={handleFinish}
          disabled={finishing}
          className="mt-6 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {finishing ? 'Submitting...' : 'Finish Round'}
        </button>
      )}

      <div className="mt-6">
        <button type="button" onClick={() => navigate('/student/rounds')} className="text-sm text-gray-500 underline dark:text-gray-400">
          Back to rounds
        </button>
      </div>
    </div>
  )
}
