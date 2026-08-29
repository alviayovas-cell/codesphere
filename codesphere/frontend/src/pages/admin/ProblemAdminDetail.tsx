import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ProblemAdminView, TestCaseVisibility } from '../../types'

interface NewCaseForm {
  input: string
  expectedOutput: string
  visibility: TestCaseVisibility
}

const emptyCase: NewCaseForm = { input: '', expectedOutput: '', visibility: 'public' }

export default function ProblemAdminDetail() {
  const { problemId } = useParams<{ problemId: string }>()
  const [problem, setProblem] = useState<ProblemAdminView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newCase, setNewCase] = useState<NewCaseForm>(emptyCase)

  const load = useCallback(() => {
    if (!problemId) return
    api
      .getProblemAdmin(problemId)
      .then(setProblem)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load problem.'))
  }, [problemId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAddCase() {
    if (!problemId) return
    setError(null)
    try {
      await api.createTestCase(problemId, newCase)
      setNewCase(emptyCase)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add test case.')
    }
  }

  async function handleDeleteCase(testCaseId: string) {
    setError(null)
    try {
      await api.deleteTestCase(testCaseId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete test case.')
    }
  }

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-2xl px-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link to="/admin/problems" className="mt-4 inline-block text-sm underline">
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
      <Link to="/admin/problems" className="text-sm text-gray-500 underline dark:text-gray-400">
        &larr; Back to problems
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-white">{problem.title}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {problem.topic} &middot; <span className="capitalize">{problem.difficulty}</span> &middot; {problem.marks} marks
      </p>
      <p className="mt-3 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{problem.description}</p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Test Cases ({problem.testCases.length})
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        {problem.testCases.map((testCase) => (
          <div key={testCase.id} className="rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  testCase.visibility === 'hidden'
                    ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                }`}
              >
                {testCase.visibility}
              </span>
              <button type="button" onClick={() => handleDeleteCase(testCase.id)} className="text-red-600 underline">
                Delete
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
              {testCase.input}
            </pre>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Expected:</p>
            <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-gray-900">
              {testCase.expectedOutput}
            </pre>
          </div>
        ))}
        {problem.testCases.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500">No test cases yet.</p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-md border border-gray-200 p-3 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Add Test Case</h3>
        <textarea
          placeholder="Input"
          value={newCase.input}
          onChange={(e) => setNewCase({ ...newCase, input: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          rows={2}
        />
        <textarea
          placeholder="Expected Output"
          value={newCase.expectedOutput}
          onChange={(e) => setNewCase({ ...newCase, expectedOutput: e.target.value })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          rows={2}
        />
        <select
          value={newCase.visibility}
          onChange={(e) => setNewCase({ ...newCase, visibility: e.target.value as TestCaseVisibility })}
          className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="public">Public</option>
          <option value="hidden">Hidden</option>
        </select>
        <button
          type="button"
          onClick={handleAddCase}
          disabled={!newCase.input || !newCase.expectedOutput}
          className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
        >
          Add
        </button>
      </div>
    </div>
  )
}
