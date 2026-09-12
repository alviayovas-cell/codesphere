import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { ApiError } from '../services/api'
import type { CodingRoundAdminView, LeaderboardResponse } from '../types'
import Spinner from '../components/ui/Spinner'

const REFRESH_MS = 5000

const rankColor: Record<number, string> = {
  1: 'text-amber-300',
  2: 'text-slate-300',
  3: 'text-orange-400',
}

/** Full-screen, chrome-free leaderboard meant to be projected during a
 * live contest. Auth-gated (reuses the admin, always-ungated leaderboard
 * endpoint) but deliberately skips AppShell's sidebar/nav - launched from
 * Round Management's "Big Screen" button, typically in its own tab. */
export default function LeaderboardDisplay() {
  const { user, isLoading: authLoading } = useAuth()
  const { roundId } = useParams<{ roundId: string }>()
  const [round, setRound] = useState<CodingRoundAdminView | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!roundId) return
    api
      .getAdminRoundLeaderboard(roundId)
      .then((data) => {
        setLeaderboard(data)
        setError(null)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load leaderboard.'))
  }, [roundId])

  useEffect(() => {
    if (!roundId) return
    api.getRoundAdmin(roundId).then(setRound).catch(() => {})
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => clearInterval(interval)
  }, [roundId, load])

  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/student/dashboard" replace />

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white sm:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-400">Live Leaderboard</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{round?.title ?? 'Coding Round'}</h1>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" /> LIVE
          </span>
        </div>

        {error && <p className="mt-10 text-red-400">{error}</p>}

        {!error && !leaderboard && (
          <div className="mt-20 flex justify-center">
            <Spinner className="h-8 w-8 text-slate-500" />
          </div>
        )}

        {!error && leaderboard && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800">
            {leaderboard.entries.length === 0 ? (
              <p className="p-10 text-center text-slate-500">No participants yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">
                    <tr>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Rank</th>
                      <th className="px-4 py-3 sm:px-6 sm:py-4">Student</th>
                      <th className="hidden px-4 py-3 sm:table-cell sm:px-6 sm:py-4">Register Number</th>
                      <th className="px-4 py-3 text-right sm:px-6 sm:py-4">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leaderboard.entries.map((entry) => (
                      <tr key={entry.studentId} className={entry.rank <= 3 ? 'bg-slate-900/60' : undefined}>
                        <td className={`px-4 py-3 text-xl font-bold sm:px-6 sm:py-4 sm:text-2xl ${rankColor[entry.rank] ?? 'text-slate-500'}`}>
                          #{entry.rank}
                        </td>
                        <td className="px-4 py-3 text-lg font-medium sm:px-6 sm:py-4 sm:text-xl">{entry.studentName}</td>
                        <td className="hidden px-4 py-3 text-slate-400 sm:table-cell sm:px-6 sm:py-4">
                          {entry.studentRegisterNumber}
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold sm:px-6 sm:py-4 sm:text-2xl">
                          {entry.score}
                          <span className="ml-1 text-sm font-normal text-slate-500">/ {entry.totalMarks}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
