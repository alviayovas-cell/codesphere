import { useAuth } from '../../context/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Welcome, {user?.name}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {user?.registerNumber} &middot; {user?.class}
      </p>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Learning modules, coding rounds and progress tracking will appear here in later phases.
      </p>
    </div>
  )
}
