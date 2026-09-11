import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../../services/api'
import { ApiError, type StudentImportResult } from '../../services/api'
import type { User } from '../../types'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Badge } from '../../components/ui/Badge'
import { Table, Tbody, Td, Th, Thead, Tr } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import { InlineError, InlineSuccess } from '../../components/ui/ErrorState'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonText } from '../../components/ui/Skeleton'
import { AlertIcon, SearchIcon, UsersIcon } from '../../components/ui/Icons'

interface AddStudentForm {
  name: string
  email: string
  registerNumber: string
  studentClass: string
  password: string
}

const emptyAddStudentForm: AddStudentForm = {
  name: '',
  email: '',
  registerNumber: '',
  studentClass: '',
  password: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateAddStudentForm(form: AddStudentForm): string | null {
  if (!form.name.trim()) return 'Name is required.'
  if (!form.email.trim()) return 'Email is required.'
  if (!EMAIL_PATTERN.test(form.email.trim())) return 'Enter a valid email address.'
  if (!form.registerNumber.trim()) return 'Register number is required.'
  if (!form.studentClass.trim()) return 'Class is required.'
  if (form.password.length < 8) return 'Password must be at least 8 characters long.'
  return null
}

export default function StudentManagement() {
  const [students, setStudents] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null)
  const [resetResult, setResetResult] = useState<{ name: string; temporaryPassword: string } | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Deactivate / Activate / Delete - each holds the target student while its
  // confirmation dialog is open (null = closed). Only one of the three can
  // be open at once, so a single in-flight id covers all three actions.
  const [pendingDeactivate, setPendingDeactivate] = useState<User | null>(null)
  const [pendingActivate, setPendingActivate] = useState<User | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [showAddStudent, setShowAddStudent] = useState(false)
  const [addStudentForm, setAddStudentForm] = useState(emptyAddStudentForm)
  const [addStudentError, setAddStudentError] = useState<string | null>(null)
  const [addingStudent, setAddingStudent] = useState(false)

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
    setSuccess(null)
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

  function closeAddStudent() {
    setShowAddStudent(false)
    setAddStudentForm(emptyAddStudentForm)
    setAddStudentError(null)
  }

  async function handleAddStudent() {
    const validationError = validateAddStudentForm(addStudentForm)
    if (validationError) {
      setAddStudentError(validationError)
      return
    }
    setAddStudentError(null)
    setAddingStudent(true)
    try {
      await api.createStudent({
        name: addStudentForm.name.trim(),
        email: addStudentForm.email.trim(),
        registerNumber: addStudentForm.registerNumber.trim(),
        class: addStudentForm.studentClass.trim(),
        password: addStudentForm.password,
      })
      closeAddStudent()
      setError(null)
      setSuccess('Student added successfully.')
      load()
    } catch (err) {
      setAddStudentError(err instanceof ApiError ? err.message : 'Could not add student.')
    } finally {
      setAddingStudent(false)
    }
  }

  async function handleResetPassword(student: User) {
    setError(null)
    setSuccess(null)
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

  async function handleDeactivate(student: User) {
    setError(null)
    setSuccess(null)
    setProcessingId(student.id)
    try {
      await api.deactivateStudent(student.id)
      setPendingDeactivate(null)
      setSuccess('Student account deactivated successfully.')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not deactivate this student.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleActivate(student: User) {
    setError(null)
    setSuccess(null)
    setProcessingId(student.id)
    try {
      await api.activateStudent(student.id)
      setPendingActivate(null)
      setSuccess('Student account activated successfully.')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not activate this student.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDelete(student: User) {
    setError(null)
    setSuccess(null)
    setProcessingId(student.id)
    try {
      await api.deleteStudent(student.id)
      setPendingDelete(null)
      setSuccess('Student profile deleted successfully.')
      load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this student.')
    } finally {
      setProcessingId(null)
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
            <Button variant="secondary" onClick={() => setShowAddStudent(true)}>
              Add Student
            </Button>
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
      {success && <div className="mt-4"><InlineSuccess message={success} /></div>}

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
                        {!student.isActive ? (
                          <Badge variant="neutral">Inactive</Badge>
                        ) : student.mustChangePassword ? (
                          <Badge variant="warning">Must change password</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={resettingId === student.id}
                            onClick={() => handleResetPassword(student)}
                          >
                            Reset Password
                          </Button>
                          {student.isActive ? (
                            <Button variant="ghost" size="sm" onClick={() => setPendingDeactivate(student)}>
                              Deactivate
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => setPendingActivate(student)}>
                              Activate
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400"
                            onClick={() => setPendingDelete(student)}
                          >
                            Delete Student
                          </Button>
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
        open={showAddStudent}
        onClose={() => (addingStudent ? undefined : closeAddStudent())}
        title="Add Student"
        footer={
          <>
            <Button variant="secondary" onClick={closeAddStudent} disabled={addingStudent}>
              Cancel
            </Button>
            <Button variant="primary" loading={addingStudent} onClick={handleAddStudent}>
              {addingStudent ? 'Adding...' : 'Add Student'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {addStudentError && <InlineError message={addStudentError} />}
          <Input
            label="Name"
            required
            value={addStudentForm.name}
            onChange={(e) => setAddStudentForm({ ...addStudentForm, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={addStudentForm.email}
            onChange={(e) => setAddStudentForm({ ...addStudentForm, email: e.target.value })}
          />
          <Input
            label="Register Number"
            required
            value={addStudentForm.registerNumber}
            onChange={(e) => setAddStudentForm({ ...addStudentForm, registerNumber: e.target.value })}
          />
          <Input
            label="Class"
            required
            value={addStudentForm.studentClass}
            onChange={(e) => setAddStudentForm({ ...addStudentForm, studentClass: e.target.value })}
          />
          <PasswordInput
            label="Password"
            required
            hint="At least 8 characters."
            value={addStudentForm.password}
            onChange={(e) => setAddStudentForm({ ...addStudentForm, password: e.target.value })}
          />
        </div>
      </Modal>

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

      <Modal
        open={pendingDeactivate !== null}
        onClose={() => (processingId ? undefined : setPendingDeactivate(null))}
        title="Deactivate Student?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDeactivate(null)} disabled={processingId !== null}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={processingId === pendingDeactivate?.id}
              onClick={() => pendingDeactivate && handleDeactivate(pendingDeactivate)}
            >
              {processingId === pendingDeactivate?.id ? 'Deactivating...' : 'Deactivate Student'}
            </Button>
          </>
        }
      >
        {pendingDeactivate && (
          <div className="flex gap-3">
            <AlertIcon className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">{pendingDeactivate.name}</span>
                {' · '}
                {pendingDeactivate.registerNumber} · {pendingDeactivate.email}
              </p>
              <p className="mt-2">
                This will prevent the student from logging in. Their submissions, results, coding-round history, and
                academic records will be preserved.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={pendingActivate !== null}
        onClose={() => (processingId ? undefined : setPendingActivate(null))}
        title="Activate Student?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingActivate(null)} disabled={processingId !== null}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={processingId === pendingActivate?.id}
              onClick={() => pendingActivate && handleActivate(pendingActivate)}
            >
              {processingId === pendingActivate?.id ? 'Activating...' : 'Activate Student'}
            </Button>
          </>
        }
      >
        {pendingActivate && (
          <div className="flex gap-3">
            <AlertIcon className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">{pendingActivate.name}</span>
                {' · '}
                {pendingActivate.registerNumber} · {pendingActivate.email}
              </p>
              <p className="mt-2">This will restore the student's ability to log in.</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={pendingDelete !== null}
        onClose={() => (processingId ? undefined : setPendingDelete(null))}
        title="Delete Student Profile?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={processingId !== null}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={processingId === pendingDelete?.id}
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              {processingId === pendingDelete?.id ? 'Deleting...' : 'Delete Student'}
            </Button>
          </>
        }
      >
        {pendingDelete && (
          <div className="flex gap-3">
            <AlertIcon className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p>
                <span className="font-semibold text-zinc-900 dark:text-white">{pendingDelete.name}</span>
                {' · '}
                {pendingDelete.registerNumber} · {pendingDelete.email} · {pendingDelete.class}
              </p>
              <p className="mt-2 font-medium text-red-600 dark:text-red-400">
                This will permanently remove the student's personal account/profile information. This action cannot
                be undone.
              </p>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Assessment records such as submissions and results will be preserved where required for
                institutional records.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
