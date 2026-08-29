import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'
import { InlineError } from '../components/ui/ErrorState'
import { CodeIcon } from '../components/ui/Icons'

export default function Login() {
  const { user, login, isLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && user) {
    if (user.mustChangePassword) return <Navigate to="/change-password" replace />
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const loggedInUser = await login(email, password)
      if (loggedInUser.mustChangePassword) {
        navigate('/change-password')
      } else {
        navigate(loggedInUser.role === 'admin' ? '/admin/dashboard' : '/student/dashboard')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero panel - the one place a subtle gradient is used, per the design brief. */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-600 p-10 text-white lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/15 backdrop-blur">
            <CodeIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold">CodeSphere</span>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Learn. Practice. Compete.</h2>
          <p className="mt-3 max-w-sm text-sm text-white/80">
            A focused C programming platform for the CSE coding club — structured lessons, real problems, and timed
            assessments in one place.
          </p>
        </div>
        <p className="text-xs text-white/60">CSE Coding Club</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
              <CodeIcon className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold text-zinc-900 dark:text-white">CodeSphere</span>
          </div>

          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Welcome back</h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Use the credentials provided by your coding club admin.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <Input
              label="Email"
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <InlineError message={error} />}

            <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
              {submitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
