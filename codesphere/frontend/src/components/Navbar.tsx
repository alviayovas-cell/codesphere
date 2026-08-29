import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <Link to="/" className="text-lg font-semibold text-gray-900 dark:text-white">
        CodeSphere
      </Link>
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        {user ? (
          <>
            <Link to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>Dashboard</Link>
            {user.role === 'student' && <Link to="/student/learning">Learning</Link>}
            {user.role === 'student' && <Link to="/student/problems">Problems</Link>}
            {user.role === 'admin' && <Link to="/admin/learning">Learning Management</Link>}
            {user.role === 'admin' && <Link to="/admin/problems">Problem Management</Link>}
            <Link to="/change-password">Change Password</Link>
            <span className="text-gray-400 dark:text-gray-500">{user.name}</span>
            <button type="button" onClick={handleLogout} className="text-gray-600 underline dark:text-gray-300">
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  )
}
