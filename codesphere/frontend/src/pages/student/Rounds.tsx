import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { CodingRoundSummary } from '../../types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function statusLabel(round: CodingRoundSummary): { text: string; action: 'start' | 'continue' | 'view' | 'wait' | 'over' } {
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

  const load = useCallback(() => {
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
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Coding Rounds</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Timed assessments assigned by your coordinator.</p>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {rounds === null && !error && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
      {rounds !== null && rounds.length === 0 && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No coding rounds are available right now.</p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {rounds?.map((round) => {
          const { text, action } = statusLabel(round)
          return (
            <div key={round.id} className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">{round.title}</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">{text}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{round.description}</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {round.questionCount} question{round.questionCount === 1 ? '' : 's'} &middot; {round.totalMarks} marks
                &middot; {round.durationMinutes} min &middot; window {formatDate(round.startTime)} &ndash;{' '}
                {formatDate(round.endTime)}
              </p>

              <div className="mt-3">
                {action === 'start' && (
                  <button
                    type="button"
                    onClick={() => handleStart(round.id)}
                    disabled={startingId === round.id}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                  >
                    {startingId === round.id ? 'Starting...' : 'Start Round'}
                  </button>
                )}
                {action === 'continue' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/student/rounds/${round.id}`)}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
                  >
                    Continue
                  </button>
                )}
                {action === 'view' && (
                  <button
                    type="button"
                    onClick={() => navigate(`/student/rounds/${round.id}`)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
