import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../../services/api'
import { ApiError, type StudentImportResult } from '../../services/api'
import type { User } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Badge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import { InlineError } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { SearchIcon, UsersIcon } from '../../components/ui/Icons'

export default function StudentManagement() {
  const [students, setStudents] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null)
  const [resetResult, setResetResult] = useState<{ name: string; temporaryPassword: string } | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setError(null)
    api
      .listStudents()
      .then(setStudents)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load students.'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleFileSelected(file: File) {
    setError(null)
    setImporting(true)
    try {
      const result = await api.importStudents(file)
      setImportResult(result)
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not import the CSV file.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleResetPassword(student: User) {
    setError(null)
    setResettingId(student.id)
    try {
      const { temporaryPassword } = await api.resetStudentPassword(student.id)
      setResetResult({ name: student.name, temporaryPassword })
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password.')
    } finally {
      setResettingId(null)
    }
  }

  const filtered = students?.filter((s) => {
    const q = search.toLowerCase()
    return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q)
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Students"
        description="Import students via CSV, and manage their access."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            />
            <Button variant="primary" loading={importing} onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
          </>
        }
      />

      {error && <div className="mt-4"><InlineError message={error} /></div>}

      {students === null && !error && (
        <div className="mt-6">
          <SkeletonText lines={5} />
        </div>
      )}

      {students !== null && (
        <>
          <div className="mt-5 w-full max-w-xs">
            <Input
              placeholder="Search by name, email, or register number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search students"
            />
          </div>

          <div className="mt-4">
            {students.length === 0 ? (
              <EmptyState
                icon={<UsersIcon className="h-6 w-6" />}
                title="No students yet."
                description="Import a CSV file with Name, RegisterNumber, Email, and Class columns to get started."
                action={<Button variant="primary" onClick={() => fileInputRef.current?.click()}>Import CSV</Button>}
              />
            ) : filtered && filtered.length === 0 ? (
              <EmptyState icon={<SearchIcon className="h-6 w-6" />} title="No students match your search." />
            ) : (
              <Table>
                <Thead>
                  <Th>Name</Th>
                  <Th>Register Number</Th>
                  <Th>Email</Th>
                  <Th>Class</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Thead>
                <Tbody>
                  {filtered?.map((student) => (
                    <Tr key={student.id}>
                      <Td className="font-medium text-zinc-900 dark:text-white">{student.name}</Td>
                      <Td>{student.registerNumber}</Td>
                      <Td>{student.email}</Td>
                      <Td>{student.class}</Td>
                      <Td>
                        {student.mustChangePassword ? (
                          <Badge variant="warning">Must change password</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={resettingId === student.id}
                          onClick={() => handleResetPassword(student)}
                        >
                          Reset Password
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </div>
        </>
      )}

      {/* Import summary - temp passwords are only ever returned once, so
          they must be shown clearly here for the admin to copy/distribute. */}
      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="Import complete"
        footer={<Button variant="primary" onClick={() => setImportResult(null)}>Done</Button>}
      >
        {importResult && (
          <div className="flex flex-col gap-3 text-left">
            <p>
              <strong>{importResult.created}</strong> student{importResult.created === 1 ? '' : 's'} created.
              {importResult.skipped.length > 0 && ` ${importResult.skipped.length} row(s) skipped.`}
            </p>
            {importResult.createdStudents.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Name</th>
                      <th className="px-2 py-1.5 font-medium">Email</th>
                      <th className="px-2 py-1.5 font-medium">Temp Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {importResult.createdStudents.map((s) => (
                      <tr key={s.id}>
                        <td className="px-2 py-1.5">{s.name}</td>
                        <td className="px-2 py-1.5">{s.email}</td>
                        <td className="px-2 py-1.5 font-mono">{s.temporaryPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {importResult.skipped.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Skipped rows</p>
                <ul className="mt-1 flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {importResult.skipped.map((s) => (
                    <li key={s.row}>
                      Row {s.row}: {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password reset"
        footer={<Button variant="primary" onClick={() => setResetResult(null)}>Done</Button>}
      >
        {resetResult && (
          <p>
            New temporary password for <strong>{resetResult.name}</strong>:{' '}
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono dark:bg-zinc-800">{resetResult.temporaryPassword}</span>
            <br />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              This is shown only once — share it with the student now. They'll be asked to change it on next login.
            </span>
          </p>
        )}
      </Modal>
    </div>
  )
}
