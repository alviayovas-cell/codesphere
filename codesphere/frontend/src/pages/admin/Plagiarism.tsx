import Editor from '@monaco-editor/react'
import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import type { CodingRoundAdminView, PlagiarismPair, ProblemPlagiarismGroup, SubmissionCodeView } from '../../types'
import { LANGUAGES, type LanguageId } from '../../lib/languages'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { AlertIcon } from '../../components/ui/Icons'

function similarityVariant(similarity: number): 'danger' | 'warning' {
  return similarity >= 0.9 ? 'danger' : 'warning'
}

export default function Plagiarism() {
  const { resolvedTheme } = useTheme()
  const [rounds, setRounds] = useState<CodingRoundAdminView[] | null>(null)
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')
  const [groups, setGroups] = useState<ProblemPlagiarismGroup[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [comparePair, setComparePair] = useState<PlagiarismPair | null>(null)
  const [codeA, setCodeA] = useState<SubmissionCodeView | null>(null)
  const [codeB, setCodeB] = useState<SubmissionCodeView | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareError, setCompareError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listRoundsAdmin()
      .then((r) => {
        setRounds(r)
        if (r.length > 0) setSelectedRoundId((current) => current || r[0].id)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load rounds.'))
  }, [])

  const loadGroups = useCallback((roundId: string) => {
    if (!roundId) return
    setError(null)
    setGroups(null)
    api
      .getRoundPlagiarism(roundId)
      .then(setGroups)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to scan for plagiarism.'))
  }, [])

  useEffect(() => {
    if (selectedRoundId) loadGroups(selectedRoundId)
  }, [selectedRoundId, loadGroups])

  function openCompare(pair: PlagiarismPair) {
    setComparePair(pair)
    setCodeA(null)
    setCodeB(null)
    setCompareError(null)
    setCompareLoading(true)
    Promise.all([api.getSubmissionCode(pair.submissionAId), api.getSubmissionCode(pair.submissionBId)])
      .then(([a, b]) => {
        setCodeA(a)
        setCodeB(b)
      })
      .catch((err) => setCompareError(err instanceof ApiError ? err.message : 'Failed to load submitted code.'))
      .finally(() => setCompareLoading(false))
  }

  function closeCompare() {
    setComparePair(null)
    setCodeA(null)
    setCodeB(null)
    setCompareError(null)
  }

  const totalFlagged = groups?.reduce((sum, g) => sum + g.pairs.length, 0) ?? 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Plagiarism Detection"
        description="Flags pairs of students whose submitted code for the same problem is suspiciously similar. A lead for review, not proof of copying."
      />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {rounds === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={4} />
        </div>
      )}

      {rounds !== null && rounds.length === 0 && (
        <div className="mt-6">
          <EmptyState icon={<AlertIcon className="h-6 w-6" />} title="No coding rounds yet." />
        </div>
      )}

      {rounds !== null && rounds.length > 0 && (
        <>
          <div className="mt-5 w-full max-w-xs">
            <Select
              label="Round"
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              aria-label="Select round to scan"
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4">
            {groups === null && !error ? (
              <SkeletonText lines={4} />
            ) : groups && groups.length === 0 ? (
              <EmptyState
                icon={<AlertIcon className="h-6 w-6" />}
                title="No similar submissions found."
                description="Nothing scored above the similarity threshold for this round - a good sign, not a guarantee."
              />
            ) : (
              <div className="flex flex-col gap-6">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {totalFlagged} pair{totalFlagged === 1 ? '' : 's'} flagged across {groups?.length} problem
                  {groups?.length === 1 ? '' : 's'}.
                </p>
                {groups?.map((group) => (
                  <div key={group.problemId}>
                    <h3 className="font-medium text-slate-900 dark:text-white">{group.problemTitle}</h3>
                    <div className="mt-2">
                      <Table>
                        <Thead>
                          <Th>Student A</Th>
                          <Th>Student B</Th>
                          <Th>Language</Th>
                          <Th>Similarity</Th>
                          <Th className="text-right">Actions</Th>
                        </Thead>
                        <Tbody>
                          {group.pairs.map((pair, i) => (
                            <Tr key={i}>
                              <Td className="font-medium text-slate-900 dark:text-white">{pair.studentAName}</Td>
                              <Td className="font-medium text-slate-900 dark:text-white">{pair.studentBName}</Td>
                              <Td>{LANGUAGES[pair.language as LanguageId]?.label ?? pair.language}</Td>
                              <Td>
                                <Badge variant={similarityVariant(pair.similarity)}>
                                  {Math.round(pair.similarity * 100)}%
                                </Badge>
                              </Td>
                              <Td className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => openCompare(pair)}>
                                  Compare
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        open={comparePair !== null}
        onClose={closeCompare}
        size="xl"
        title={comparePair ? `Compare — ${comparePair.studentAName} vs ${comparePair.studentBName}` : 'Compare code'}
        footer={<Button variant="primary" onClick={closeCompare}>Close</Button>}
      >
        {comparePair && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Badge variant={similarityVariant(comparePair.similarity)}>
                {Math.round(comparePair.similarity * 100)}% similar
              </Badge>
              <span>{LANGUAGES[comparePair.language as LanguageId]?.label ?? comparePair.language}</span>
            </div>

            {compareError && <InlineError message={compareError} />}

            {!compareError && compareLoading && (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="h-4 w-4" /> Loading code...
              </div>
            )}

            {!compareError && !compareLoading && codeA && codeB && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[{ label: comparePair.studentAName, view: codeA }, { label: comparePair.studentBName, view: codeB }].map(
                  ({ label, view }) => (
                    <div key={label} className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
                        {label} &middot; score {view.score}
                      </div>
                      <Editor
                        height="360px"
                        language={LANGUAGES[view.language as LanguageId]?.monacoId ?? 'plaintext'}
                        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                        value={view.code}
                        options={{
                          readOnly: true,
                          domReadOnly: true,
                          minimap: { enabled: false },
                          fontSize: 12,
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
