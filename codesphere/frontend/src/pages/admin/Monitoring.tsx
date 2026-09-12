import Editor from '@monaco-editor/react'
import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import { useTheme } from '../../context/ThemeContext'
import type {
  ActivityEventPublic,
  ActivityEventType,
  CodingRoundAdminView,
  SessionMonitorSummary,
  StudentAutosaveView,
} from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Badge, SessionStatusBadge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { MonitorIcon } from '../../components/ui/Icons'
import { LANGUAGES, type LanguageId } from '../../lib/languages'

const eventTypeLabel: Record<ActivityEventType, string> = {
  visibility_hidden: 'Left tab / window minimized',
  visibility_restored: 'Returned to tab',
  window_blur: 'Window lost focus',
  window_focus: 'Window regained focus',
  warning: 'Violation recorded',
  auto_submit: 'Auto-submitted by system',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' })
}

export default function Monitoring() {
  const { resolvedTheme } = useTheme()
  const [rounds, setRounds] = useState<CodingRoundAdminView[] | null>(null)
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')
  const [sessions, setSessions] = useState<SessionMonitorSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

  const [activitySession, setActivitySession] = useState<SessionMonitorSummary | null>(null)
  const [activity, setActivity] = useState<ActivityEventPublic[] | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  // Code viewer: latest autosaved code for one student + one problem.
  const [codeSession, setCodeSession] = useState<SessionMonitorSummary | null>(null)
  const [codeProblemId, setCodeProblemId] = useState<string>('')
  const [codeView, setCodeView] = useState<StudentAutosaveView | null>(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  useEffect(() => {
    api
      .listRoundsAdmin()
      .then((r) => {
        setRounds(r)
        if (r.length > 0) setSelectedRoundId((current) => current || r[0].id)
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load rounds.'))
  }, [])

  const loadSessions = useCallback((roundId: string) => {
    if (!roundId) return
    setError(null)
    api
      .listRoundSessions(roundId)
      .then(setSessions)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load sessions.'))
  }, [])

  useEffect(() => {
    if (selectedRoundId) {
      setSessions(null)
      loadSessions(selectedRoundId)
    }
  }, [selectedRoundId, loadSessions])

  async function openActivity(session: SessionMonitorSummary) {
    setActivitySession(session)
    setActivity(null)
    setActivityError(null)
    try {
      const events = await api.getSessionActivity(session.sessionId)
      setActivity(events)
    } catch (err) {
      setActivityError(err instanceof ApiError ? err.message : 'Failed to load activity log.')
    }
  }

  async function handleUnlock(session: SessionMonitorSummary) {
    setError(null)
    setUnlockingId(session.sessionId)
    try {
      await api.unlockSession(session.sessionId)
      loadSessions(selectedRoundId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unlock this session.')
    } finally {
      setUnlockingId(null)
    }
  }

  const fetchCode = useCallback(
    async (roundId: string, studentId: string, problemId: string) => {
      if (!roundId || !studentId || !problemId) return
      setCodeLoading(true)
      setCodeError(null)
      try {
        setCodeView(await api.getStudentAutosave(roundId, studentId, problemId))
      } catch (err) {
        setCodeView(null)
        setCodeError(err instanceof ApiError ? err.message : 'Failed to load the student’s code.')
      } finally {
        setCodeLoading(false)
      }
    },
    [],
  )

  function openCode(session: SessionMonitorSummary) {
    const problemId = session.assignedProblems[0]?.problemId ?? ''
    setCodeSession(session)
    setCodeProblemId(problemId)
    setCodeView(null)
    setCodeError(null)
    if (problemId) fetchCode(selectedRoundId, session.studentId, problemId)
  }

  function selectCodeProblem(problemId: string) {
    setCodeProblemId(problemId)
    if (codeSession) fetchCode(selectedRoundId, codeSession.studentId, problemId)
  }

  function closeCode() {
    setCodeSession(null)
    setCodeView(null)
    setCodeError(null)
    setCodeProblemId('')
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Assessment Monitoring"
        description="Track active sessions and visibility/focus violations during coding rounds."
      />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {rounds === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={4} />
        </div>
      )}

      {rounds !== null && rounds.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={<MonitorIcon className="h-6 w-6" />}
            title="No coding rounds yet."
            description="Create a coding round to start monitoring student sessions."
          />
        </div>
      )}

      {rounds !== null && rounds.length > 0 && (
        <>
          <div className="mt-5 w-full max-w-xs">
            <Select
              label="Round"
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              aria-label="Select round to monitor"
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4">
            {sessions === null ? (
              <SkeletonText lines={4} />
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={<MonitorIcon className="h-6 w-6" />}
                title="No students have started this round yet."
              />
            ) : (
              <Table>
                <Thead>
                  <Th>Student</Th>
                  <Th>Register Number</Th>
                  <Th>Status</Th>
                  <Th>Violations</Th>
                  <Th>Started</Th>
                  <Th>Expires</Th>
                  <Th className="text-right">Actions</Th>
                </Thead>
                <Tbody>
                  {sessions.map((session) => (
                    <Tr key={session.sessionId}>
                      <Td className="font-medium text-slate-900 dark:text-white">{session.studentName}</Td>
                      <Td>{session.studentRegisterNumber}</Td>
                      <Td>
                        <SessionStatusBadge status={session.status} />
                      </Td>
                      <Td>
                        {session.violationCount > 0 ? (
                          <Badge variant="warning">{session.violationCount}</Badge>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">0</span>
                        )}
                      </Td>
                      <Td>{formatDateTime(session.startedAt)}</Td>
                      <Td>{formatDateTime(session.expiresAt)}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          {session.assignedProblems.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => openCode(session)}>
                              View Code
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openActivity(session)}>
                            View Log
                          </Button>
                          {(session.status === 'locked' || session.status === 'expired') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={unlockingId === session.sessionId}
                              onClick={() => handleUnlock(session)}
                            >
                              Unlock
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </>
      )}

      <Modal
        open={activitySession !== null}
        onClose={() => setActivitySession(null)}
        title={activitySession ? `Activity log — ${activitySession.studentName}` : 'Activity log'}
        footer={<Button variant="primary" onClick={() => setActivitySession(null)}>Close</Button>}
      >
        {activityError && <InlineError message={activityError} />}
        {!activityError && activity === null && <SkeletonText lines={3} />}
        {!activityError && activity !== null && activity.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No activity events recorded for this session.</p>
        )}
        {!activityError && activity !== null && activity.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Event</th>
                  <th className="px-2 py-1.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activity.map((event) => (
                  <tr key={event.id}>
                    <td className="px-2 py-1.5">{eventTypeLabel[event.eventType] ?? event.eventType}</td>
                    <td className="px-2 py-1.5">{formatDateTime(event.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={codeSession !== null}
        onClose={closeCode}
        size="xl"
        title={codeSession ? `Code — ${codeSession.studentName}` : 'Student code'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                codeSession && fetchCode(selectedRoundId, codeSession.studentId, codeProblemId)
              }
              disabled={codeLoading || !codeProblemId}
            >
              Refresh
            </Button>
            <Button variant="primary" onClick={closeCode}>
              Close
            </Button>
          </>
        }
      >
        {codeSession && (
          <div className="flex flex-col gap-3">
            {codeSession.assignedProblems.length > 1 && (
              <div className="max-w-sm">
                <Select
                  label="Problem"
                  value={codeProblemId}
                  onChange={(e) => selectCodeProblem(e.target.value)}
                  aria-label="Select problem"
                >
                  {codeSession.assignedProblems.map((p) => (
                    <option key={p.problemId} value={p.problemId}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
              <div>
                <dt className="font-medium text-slate-400 dark:text-slate-500">Student</dt>
                <dd className="text-slate-700 dark:text-slate-200">{codeSession.studentName}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-400 dark:text-slate-500">Register Number</dt>
                <dd className="text-slate-700 dark:text-slate-200">{codeSession.studentRegisterNumber}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-400 dark:text-slate-500">Problem</dt>
                <dd className="text-slate-700 dark:text-slate-200">
                  {codeView?.problemTitle ??
                    codeSession.assignedProblems.find((p) => p.problemId === codeProblemId)?.title ??
                    '—'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-400 dark:text-slate-500">Language</dt>
                <dd className="text-slate-700 dark:text-slate-200">
                  {LANGUAGES[codeView?.language as LanguageId]?.label ?? codeView?.language ?? 'C'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-400 dark:text-slate-500">Status</dt>
                <dd className="text-slate-700 dark:text-slate-200">Latest Saved Code</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-400 dark:text-slate-500">Last Saved</dt>
                <dd className="text-slate-700 dark:text-slate-200">
                  {codeView?.updatedAt ? formatDateTime(codeView.updatedAt) : 'Not saved yet'}
                </dd>
              </div>
            </dl>

            {codeError && <InlineError message={codeError} />}

            {!codeError && codeLoading && (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="h-4 w-4" /> Loading code...
              </div>
            )}

            {!codeError && !codeLoading && codeView && codeView.code === null && (
              <p className="rounded-md border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No code has been saved yet.
              </p>
            )}

            {!codeError && !codeLoading && codeView && codeView.code !== null && (
              <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                <Editor
                  height="420px"
                  language={LANGUAGES[codeView.language as LanguageId]?.monacoId ?? 'plaintext'}
                  theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
                  value={codeView.code}
                  options={{
                    readOnly: true,
                    domReadOnly: true,
                    minimap: { enabled: false },
                    fontSize: 13,
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
