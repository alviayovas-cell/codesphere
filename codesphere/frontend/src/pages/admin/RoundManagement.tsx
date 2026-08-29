import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { CodingRoundAdminView, ProblemSummary } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Field'
import { RoundStatusBadge } from '../../components/ui/Badge'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/Skeleton'
import { ClockIcon } from '../../components/ui/Icons'

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
    setError(null)
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Coding Round Management"
        description="Create, publish, and manage timed assessments."
        actions={
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'New Round'}
          </Button>
        }
      />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {showForm && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

          <div className="flex flex-wrap gap-2">
            <div className="flex-1">
              <Input label="Start Time" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="flex-1">
              <Input label="End Time" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div className="w-32">
              <Input label="Duration (min)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
            </div>
          </div>

          <div className="rounded-md border border-zinc-100 p-3 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Smart Randomization (optional)
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Leave all at 0 to assign every selected problem to every student, in order. Set counts to have each
              student get a balanced, randomized combination instead.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="w-20">
                <Input label="Easy" type="number" min={0} value={form.easyQuestions} onChange={(e) => setForm({ ...form, easyQuestions: e.target.value })} />
              </div>
              <div className="w-20">
                <Input label="Medium" type="number" min={0} value={form.mediumQuestions} onChange={(e) => setForm({ ...form, mediumQuestions: e.target.value })} />
              </div>
              <div className="w-20">
                <Input label="Hard" type="number" min={0} value={form.hardQuestions} onChange={(e) => setForm({ ...form, hardQuestions: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={form.randomizeOrder}
                  onChange={(e) => setForm({ ...form, randomizeOrder: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-600"
                />
                Randomize order
              </label>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Problems ({form.problemIds.length} selected)
            </p>
            <div className="mt-1.5 flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-zinc-100 p-2 dark:border-zinc-800">
              {problems?.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={form.problemIds.includes(p.id)}
                    onChange={() => toggleProblem(p.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-600"
                  />
                  {p.title} <span className="text-xs text-zinc-500 dark:text-zinc-400">({p.difficulty}, {p.marks} marks)</span>
                </label>
              ))}
            </div>
          </div>

          <Button variant="primary" className="self-start" onClick={handleCreate} disabled={!canSubmit}>
            Create Round
          </Button>
        </div>
      )}

      {rounds === null && !error && (
        <div className="mt-6 flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {rounds !== null && rounds.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={<ClockIcon className="h-6 w-6" />} title="No coding rounds yet." action={<Button variant="primary" onClick={() => setShowForm(true)}>New Round</Button>} />
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {rounds?.map((round) => (
          <div key={round.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium text-zinc-900 dark:text-white">{round.title}</h3>
              <RoundStatusBadge status={round.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{round.description}</p>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              {round.problemIds.length} problem{round.problemIds.length === 1 ? '' : 's'} in pool &middot; {round.durationMinutes} min
              &middot; {toLocalInputValue(round.startTime)} &ndash; {toLocalInputValue(round.endTime)}
            </p>
            {(round.questionPoolConfiguration.easyQuestions > 0 ||
              round.questionPoolConfiguration.mediumQuestions > 0 ||
              round.questionPoolConfiguration.hardQuestions > 0) && (
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Smart assignment: {round.questionPoolConfiguration.easyQuestions} easy, {round.questionPoolConfiguration.mediumQuestions} medium,{' '}
                {round.questionPoolConfiguration.hardQuestions} hard per student
                {round.questionPoolConfiguration.randomizeOrder ? ', randomized order' : ''}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => handlePublishToggle(round)}>
                {round.status === 'draft' ? 'Publish' : 'Unpublish'}
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(round.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
