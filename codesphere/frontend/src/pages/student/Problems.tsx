import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ProblemSummary } from '../../types'

const difficultyColor: Record<string, string> = {
  easy: 'text-green-600 dark:text-green-400',
  medium: 'text-amber-600 dark:text-amber-400',
  hard: 'text-red-600 dark:text-red-400',
}

export default function Problems() {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getProblems()
      .then(setProblems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load problems.'))
  }, [])

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Practice Problems</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Data Structures problems to practice in C.
      </p>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {problems === null && !error && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}
      {problems !== null && problems.length === 0 && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No problems available yet.</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Topic</th>
              <th className="px-4 py-2 font-medium">Difficulty</th>
              <th className="px-4 py-2 font-medium">Marks</th>
            </tr>
          </thead>
          <tbody>
            {problems?.map((problem) => (
              <tr key={problem.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <td className="px-4 py-2">
                  <Link
                    to={`/student/problems/${problem.id}`}
                    className="text-gray-900 hover:underline dark:text-white"
                  >
                    {problem.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{problem.topic}</td>
                <td className={`px-4 py-2 font-medium capitalize ${difficultyColor[problem.difficulty]}`}>
                  {problem.difficulty}
                </td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{problem.marks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
