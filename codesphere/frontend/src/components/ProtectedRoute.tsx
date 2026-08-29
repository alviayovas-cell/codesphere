import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: UserRole
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="mx-auto mt-16 max-w-3xl px-4 text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    const fallback = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
