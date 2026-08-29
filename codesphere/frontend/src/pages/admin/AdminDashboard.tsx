import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto mt-16 max-w-3xl px-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Welcome, {user?.name}
      </h1>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Student, content and coding round management will appear here in later phases.
      </p>
    </div>
  )
}
