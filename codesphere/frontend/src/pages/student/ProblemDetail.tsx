import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ProblemPublic } from '../../types'

export default function ProblemDetail() {
  const { problemId } = useParams<{ problemId: string }>()
  const [problem, setProblem] = useState<ProblemPublic | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!problemId) return
    api
      .getProblem(problemId)
      .then(setProblem)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load problem.'))
  }, [problemId])

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-2xl px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link to="/student/problems" className="mt-4 inline-block text-sm underline">
          Back to problems
        </Link>
      </div>
    )
  }

  if (!problem) {
    return <div className="mx-auto mt-16 max-w-2xl px-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  }

  return (
    <div className="mx-auto mt-16 max-w-2xl px-4 pb-16">
      <Link to="/student/problems" className="text-sm text-gray-500 underline dark:text-gray-400">
        &larr; Back to problems
      </Link>

      <div className="mt-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{problem.title}</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{problem.marks} marks</span>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {problem.topic} &middot; <span className="capitalize">{problem.difficulty}</span>
      </p>

      <p className="mt-4 whitespace-pre-line text-gray-800 dark:text-gray-200">{problem.description}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Input Format
          </h2>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
            {problem.inputFormat}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Output Format
          </h2>
          <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
            {problem.outputFormat}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Constraints
        </h2>
        <p className="mt-1 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
          {problem.constraints}
        </p>
      </div>

      {problem.examples.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Examples
          </h2>
          {problem.examples.map((example, index) => (
            <div key={index} className="mt-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Input</p>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm dark:bg-gray-900">
                {example.input}
              </pre>
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Output</p>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm dark:bg-gray-900">
                {example.output}
              </pre>
              {example.explanation && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{example.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {problem.publicTestCases.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Public Test Cases
          </h2>
          {problem.publicTestCases.map((testCase, index) => (
            <div key={index} className="mt-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Input</p>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm dark:bg-gray-900">
                {testCase.input}
              </pre>
              <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">Expected Output</p>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-sm dark:bg-gray-900">
                {testCase.expectedOutput}
              </pre>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        The online code editor and Run/Submit are coming in a later phase.
      </p>
    </div>
  )
}
