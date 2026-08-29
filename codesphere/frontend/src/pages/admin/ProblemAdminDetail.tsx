import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ProblemAdminView, TestCaseVisibility } from '../../types'
import Button from '../../components/ui/Button'
import { Badge, DifficultyBadge } from '../../components/ui/Badge'
import { Select, Textarea } from '../../components/ui/Field'
import ErrorState, { InlineError } from '../../components/ui/ErrorState'
import { PageSpinner } from '../../components/ui/Spinner'
import { ChevronLeftIcon } from '../../components/ui/Icons'

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
    setError(null)
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

  if (error && !problem) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <ErrorState message={error} onRetry={load} />
        <Link to="/admin/problems" className="mt-4 inline-block text-sm text-zinc-500 underline dark:text-zinc-400">
          Back to problems
        </Link>
      </div>
    )
  }

  if (!problem) return <PageSpinner />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/admin/problems" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        <ChevronLeftIcon className="h-4 w-4" /> Back to problems
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-white">{problem.title}</h1>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span>{problem.topic}</span>
        <DifficultyBadge difficulty={problem.difficulty} />
        <span>{problem.marks} marks</span>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{problem.description}</p>

      {error && <div className="mt-3"><InlineError message={error} /></div>}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        Test Cases ({problem.testCases.length})
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        {problem.testCases.map((testCase) => (
          <div key={testCase.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <Badge variant={testCase.visibility === 'hidden' ? 'neutral' : 'success'}>{testCase.visibility}</Badge>
              <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDeleteCase(testCase.id)}>
                Delete
              </Button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">{testCase.input}</pre>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Expected:</p>
            <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs dark:bg-zinc-900">{testCase.expectedOutput}</pre>
          </div>
        ))}
        {problem.testCases.length === 0 && <p className="text-sm text-zinc-400 dark:text-zinc-500">No test cases yet.</p>}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Add Test Case</h3>
        <Textarea placeholder="Input" value={newCase.input} onChange={(e) => setNewCase({ ...newCase, input: e.target.value })} rows={2} />
        <Textarea
          placeholder="Expected Output"
          value={newCase.expectedOutput}
          onChange={(e) => setNewCase({ ...newCase, expectedOutput: e.target.value })}
          rows={2}
        />
        <div className="w-32">
          <Select value={newCase.visibility} onChange={(e) => setNewCase({ ...newCase, visibility: e.target.value as TestCaseVisibility })}>
            <option value="public">Public</option>
            <option value="hidden">Hidden</option>
          </Select>
        </div>
        <Button variant="primary" className="self-start" onClick={handleAddCase} disabled={!newCase.input || !newCase.expectedOutput}>
          Add
        </Button>
      </div>
    </div>
  )
}
