import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ProblemSummary } from '../../types'

interface NewProblemForm {
  title: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  marks: string
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
}

const emptyForm: NewProblemForm = {
  title: '',
  topic: '',
  difficulty: 'easy',
  marks: '',
  description: '',
  inputFormat: '',
  outputFormat: '',
  constraints: '',
}

export default function ProblemManagement() {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<NewProblemForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    api
      .getProblems()
      .then(setProblems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load problems.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate() {
    setError(null)
    try {
      await api.createProblem({
        title: form.title,
        topic: form.topic,
        difficulty: form.difficulty,
        marks: Number(form.marks) || 0,
        description: form.description,
        inputFormat: form.inputFormat,
        outputFormat: form.outputFormat,
        constraints: form.constraints,
      })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create problem.')
    }
  }

  async function handleDelete(problemId: string) {
    setError(null)
    try {
      await api.deleteProblem(problemId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete problem.')
    }
  }

  const canSubmit =
    form.title && form.topic && form.marks && form.description && form.inputFormat && form.outputFormat && form.constraints

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Problem Management</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
        >
          {showForm ? 'Cancel' : 'New Problem'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {showForm && (
        <div className="mt-4 flex flex-col gap-2 rounded-md border border-gray-200 p-4 dark:border-gray-800">
          <input
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <div className="flex gap-2">
            <input
              placeholder="Topic (e.g. Arrays)"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as NewProblemForm['difficulty'] })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <input
              placeholder="Marks"
              type="number"
              value={form.marks}
              onChange={(e) => setForm({ ...form, marks: e.target.value })}
              className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            rows={3}
          />
          <textarea
            placeholder="Input Format"
            value={form.inputFormat}
            onChange={(e) => setForm({ ...form, inputFormat: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            rows={2}
          />
          <textarea
            placeholder="Output Format"
            value={form.outputFormat}
            onChange={(e) => setForm({ ...form, outputFormat: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            rows={2}
          />
          <textarea
            placeholder="Constraints"
            value={form.constraints}
            onChange={(e) => setForm({ ...form, constraints: e.target.value })}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            rows={2}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            Create
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            After creating, open the problem to add public and hidden test cases.
          </p>
        </div>
      )}

      {problems === null && !error && (
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-md border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Topic</th>
              <th className="px-4 py-2 font-medium">Difficulty</th>
              <th className="px-4 py-2 font-medium">Marks</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {problems?.map((problem) => (
              <tr key={problem.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <td className="px-4 py-2">
                  <Link to={`/admin/problems/${problem.id}`} className="text-gray-900 hover:underline dark:text-white">
                    {problem.title}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{problem.topic}</td>
                <td className="px-4 py-2 capitalize text-gray-600 dark:text-gray-300">{problem.difficulty}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{problem.marks}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" onClick={() => handleDelete(problem.id)} className="text-red-600 underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
