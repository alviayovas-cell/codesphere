import { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { Difficulty, ProblemSummary } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import { DifficultyBadge } from '../../components/ui/Badge'
import { Input, Select } from '../../components/ui/Field'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import { SearchIcon } from '../../components/ui/Icons'
import ErrorState from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'

export default function Problems() {
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [topic, setTopic] = useState<string>('all')

  function load() {
    setError(null)
    api
      .getProblems()
      .then(setProblems)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load problems.'))
  }

  useEffect(load, [])

  const topics = useMemo(() => Array.from(new Set(problems?.map((p) => p.topic) ?? [])).sort(), [problems])

  const filtered = useMemo(() => {
    if (!problems) return []
    return problems.filter((p) => {
      if (difficulty !== 'all' && p.difficulty !== difficulty) return false
      if (topic !== 'all' && p.topic !== topic) return false
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [problems, difficulty, topic, search])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Practice Problems" description="Improve your problem-solving skills." />

      {error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}

      {problems === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={5} />
        </div>
      )}

      {problems !== null && (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="w-full sm:max-w-xs">
              <Input
                placeholder="Search problems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search problems"
              />
            </div>
            <div className="w-36">
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | 'all')} aria-label="Filter by difficulty">
                <option value="all">All difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
            </div>
            <div className="w-40">
              <Select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Filter by topic">
                <option value="all">All topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<SearchIcon className="h-6 w-6" />}
                title="No problems match your filters."
                description="Try a different search term or clear the filters."
              />
            ) : (
              <Table>
                <Thead>
                  <Th>Title</Th>
                  <Th>Difficulty</Th>
                  <Th>Topic</Th>
                  <Th className="text-right">Marks</Th>
                </Thead>
                <Tbody>
                  {filtered.map((problem) => (
                    <Tr key={problem.id}>
                      <Td>
                        <Link to={`/student/problems/${problem.id}`} className="font-medium text-zinc-900 hover:text-primary-700 dark:text-white dark:hover:text-primary-400">
                          {problem.title}
                        </Link>
                      </Td>
                      <Td>
                        <DifficultyBadge difficulty={problem.difficulty} />
                      </Td>
                      <Td>{problem.topic}</Td>
                      <Td className="text-right tabular-nums">{problem.marks}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
