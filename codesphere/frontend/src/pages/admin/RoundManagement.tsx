import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { CodingRoundAdminView, ProblemSummary } from '../../types'

interface FormState {
  title: string
  description: string
  durationMinutes: string
  startTime: string
  endTime: string
  problemIds: string[]
  easyQuestions: string
  mediumQuestions: string
  hardQuestions: string
  randomizeOrder: boolean
}

const emptyForm: FormState = {
  title: '',
  description: '',
  durationMinutes: '60',
  startTime: '',
  endTime: '',
  problemIds: [],
  easyQuestions: '0',
  mediumQuestions: '0',
  hardQuestions: '0',
  randomizeOrder: true,
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function RoundManagement() {
  const [rounds, setRounds] = useState<CodingRoundAdminView[] | null>(null)
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    api
      .listRoundsAdmin()
      .then(setRounds)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load rounds.'))
    api.getProblems().then(setProblems).catch(() => setProblems([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggleProblem(id: string) {
    setForm((f) => ({
      ...f,
      problemIds: f.problemIds.includes(id) ? f.problemIds.filter((p) => p !== id) : [...f.problemIds, id],
    }))
  }

  async function handleCreate() {
    setError(null)
    try {
      await api.createRound({
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes) || 60,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        problemIds: form.problemIds,
        questionPoolConfiguration: {
          easyQuestions: Number(form.easyQuestions) || 0,
          mediumQuestions: Number(form.mediumQuestions) || 0,
          hardQuestions: Number(form.hardQuestions) || 0,
          randomizeOrder: form.randomizeOrder,
        },
      })
      setForm(emptyForm)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create round.')
    }
  }

  async function handlePublishToggle(round: CodingRoundAdminView) {
    setError(null)
    try {
      await api.updateRound(round.id, { status: round.status === 'draft' ? 'scheduled' : 'draft' })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update round.')
    }
  }

  async function handleDelete(roundId: string) {
    setError(null)
    try {
      await api.deleteRound(roundId)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete round.')
    }
  }

  const canSubmit = form.title && form.description && form.startTime && form.endTime && form.problemIds.length > 0

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Coding Round Management</h1>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
        >
          {showForm ? 'Cancel' : 'New Round'}
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
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-gray-500 dark:text-gray-400">
              Start Time
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="flex-1 text-xs text-gray-500 dark:text-gray-400">
              End Time
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="w-32 text-xs text-gray-500 dark:text-gray-400">
              Duration (min)
              <input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Smart Randomization (optional)
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Leave all at 0 to assign every selected problem to every student, in order (simple mode). Set counts to
            have each student get a balanced, randomized combination instead.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="w-24 text-xs text-gray-500 dark:text-gray-400">
              Easy
              <input
                type="number"
                min={0}
                value={form.easyQuestions}
                onChange={(e) => setForm({ ...form, easyQuestions: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="w-24 text-xs text-gray-500 dark:text-gray-400">
              Medium
              <input
                type="number"
                min={0}
                value={form.mediumQuestions}
                onChange={(e) => setForm({ ...form, mediumQuestions: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="w-24 text-xs text-gray-500 dark:text-gray-400">
              Hard
              <input
                type="number"
                min={0}
                value={form.hardQuestions}
                onChange={(e) => setForm({ ...form, hardQuestions: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.randomizeOrder}
                onChange={(e) => setForm({ ...form, randomizeOrder: e.target.checked })}
              />
              Randomize question order
            </label>
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Problems ({form.problemIds.length} selected)
          </p>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-gray-100 p-2 dark:border-gray-800">
            {problems?.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.problemIds.includes(p.id)}
                  onChange={() => toggleProblem(p.id)}
                />
                {p.title} <span className="text-xs text-gray-500 dark:text-gray-400">({p.difficulty}, {p.marks} marks)</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
            className="mt-2 self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            Create Round
          </button>
        </div>
      )}

      {rounds === null && !error && <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>}

      <div className="mt-6 flex flex-col gap-3">
        {rounds?.map((round) => (
          <div key={round.id} className="rounded-md border border-gray-200 p-4 dark:border-gray-800">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">{round.title}</h3>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  round.status === 'scheduled'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {round.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{round.description}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {round.problemIds.length} problem{round.problemIds.length === 1 ? '' : 's'} in pool &middot;{' '}
              {round.durationMinutes} min &middot; {toLocalInputValue(round.startTime)} &ndash;{' '}
              {toLocalInputValue(round.endTime)}
            </p>
            {(round.questionPoolConfiguration.easyQuestions > 0 ||
              round.questionPoolConfiguration.mediumQuestions > 0 ||
              round.questionPoolConfiguration.hardQuestions > 0) && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Smart assignment: {round.questionPoolConfiguration.easyQuestions} easy,{' '}
                {round.questionPoolConfiguration.mediumQuestions} medium,{' '}
                {round.questionPoolConfiguration.hardQuestions} hard per student
                {round.questionPoolConfiguration.randomizeOrder ? ', randomized order' : ''}
              </p>
            )}
            <div className="mt-3 flex gap-2 text-sm">
              <button type="button" onClick={() => handlePublishToggle(round)} className="text-blue-600 underline">
                {round.status === 'draft' ? 'Publish' : 'Unpublish'}
              </button>
              <button type="button" onClick={() => handleDelete(round.id)} className="text-red-600 underline">
                Delete
              </button>
            </div>
          </div>
        ))}
        {rounds !== null && rounds.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No coding rounds yet.</p>
        )}
      </div>
    </div>
  )
}
