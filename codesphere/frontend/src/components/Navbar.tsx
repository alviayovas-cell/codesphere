import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
      <Link to="/" className="text-lg font-semibold text-gray-900 dark:text-white">
        CodeSphere
      </Link>
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-300">
        <Link to="/login">Login</Link>
        <Link to="/student/dashboard">Student</Link>
        <Link to="/admin/dashboard">Admin</Link>
      </div>
    </nav>
  )
}
