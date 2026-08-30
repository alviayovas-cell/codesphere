import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ProblemSummary } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Field'
import { DifficultyBadge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { CodeIcon } from '../../components/ui/Icons'

interface NewProblemForm {
  title: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  marks: string
  description: string
  inputFormat: string
  outputFormat: string
  constraints: string
  isAssessmentOnly: boolean
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
  isAssessmentOnly: false,
}

export default function ProblemManagement() {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<NewProblemForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    setError(null)
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
        isAssessmentOnly: form.isAssessmentOnly,
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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Problem Management"
        description="Create and manage the coding problem bank."
        actions={
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'New Problem'}
          </Button>
        }
      />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {showForm && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex gap-2">
            <div className="flex-1">
              <Input placeholder="Topic (e.g. Arrays)" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div className="w-32">
              <Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as NewProblemForm['difficulty'] })}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>
            <div className="w-24">
              <Input placeholder="Marks" type="number" value={form.marks} onChange={(e) => setForm({ ...form, marks: e.target.value })} />
            </div>
          </div>
          <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          <Textarea placeholder="Input Format" value={form.inputFormat} onChange={(e) => setForm({ ...form, inputFormat: e.target.value })} rows={2} />
          <Textarea placeholder="Output Format" value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })} rows={2} />
          <Textarea placeholder="Constraints" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} rows={2} />
          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.isAssessmentOnly}
              onChange={(e) => setForm({ ...form, isAssessmentOnly: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-primary-600 focus:ring-primary-500 dark:border-zinc-600"
            />
            <span>
              Assessment only
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                Hide this problem from the general practice bank - only visible to a student once they've started a
                round it's assigned to.
              </span>
            </span>
          </label>
          <Button variant="primary" className="self-start" onClick={handleCreate} disabled={!canSubmit}>
            Create
          </Button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            After creating, open the problem to add public and hidden test cases.
          </p>
        </div>
      )}

      {problems === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={5} />
        </div>
      )}

      <div className="mt-6">
        {problems !== null && problems.length === 0 ? (
          <EmptyState icon={<CodeIcon className="h-6 w-6" />} title="No problems yet." action={<Button variant="primary" onClick={() => setShowForm(true)}>New Problem</Button>} />
        ) : (
          problems && (
            <Table>
              <Thead>
                <Th>Title</Th>
                <Th>Topic</Th>
                <Th>Difficulty</Th>
                <Th>Marks</Th>
                <Th className="text-right">Actions</Th>
              </Thead>
              <Tbody>
                {problems.map((problem) => (
                  <Tr key={problem.id}>
                    <Td>
                      <Link to={`/admin/problems/${problem.id}`} className="font-medium text-zinc-900 hover:text-primary-700 dark:text-white dark:hover:text-primary-400">
                        {problem.title}
                      </Link>
                    </Td>
                    <Td>{problem.topic}</Td>
                    <Td>
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </Td>
                    <Td>{problem.marks}</Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(problem.id)}>
                        Delete
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )
        )}
      </div>
    </div>
  )
}
