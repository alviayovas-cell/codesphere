import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { ApiError } from '../services/api'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { InlineError } from '../components/ui/ErrorState'
import { AlertIcon, CodeIcon } from '../components/ui/Icons'

export default function ChangePassword() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    setSubmitting(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      await refreshUser()
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change password. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
            <CodeIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold text-zinc-900 dark:text-white">CodeSphere</span>
        </div>

        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Change Password</h1>

        {user?.mustChangePassword && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            You must set a new password before continuing.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Current Password"
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New Password"
            id="newPassword"
            type="password"
            required
            minLength={8}
            hint="At least 8 characters."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm New Password"
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <InlineError message={error} />}

          <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
            {submitting ? 'Saving...' : 'Change Password'}
          </Button>
        </form>
      </div>
    </div>
  )
}
