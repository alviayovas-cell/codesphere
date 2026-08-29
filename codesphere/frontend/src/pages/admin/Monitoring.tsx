import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { ApiError } from '../../services/api'
import type { ActivityEventPublic, ActivityEventType, CodingRoundAdminView, SessionMonitorSummary } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { Badge, SessionStatusBadge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { MonitorIcon } from '../../components/ui/Icons'

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
  const [rounds, setRounds] = useState<CodingRoundAdminView[] | null>(null)
  const [selectedRoundId, setSelectedRoundId] = useState<string>('')
  const [sessions, setSessions] = useState<SessionMonitorSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)

  const [activitySession, setActivitySession] = useState<SessionMonitorSummary | null>(null)
  const [activity, setActivity] = useState<ActivityEventPublic[] | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

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
                      <Td className="font-medium text-zinc-900 dark:text-white">{session.studentName}</Td>
                      <Td>{session.studentRegisterNumber}</Td>
                      <Td>
                        <SessionStatusBadge status={session.status} />
                      </Td>
                      <Td>
                        {session.violationCount > 0 ? (
                          <Badge variant="warning">{session.violationCount}</Badge>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">0</span>
                        )}
                      </Td>
                      <Td>{formatDateTime(session.startedAt)}</Td>
                      <Td>{formatDateTime(session.expiresAt)}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
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
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity events recorded for this session.</p>
        )}
        {!activityError && activity !== null && activity.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Event</th>
                  <th className="px-2 py-1.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
    </div>
  )
}
