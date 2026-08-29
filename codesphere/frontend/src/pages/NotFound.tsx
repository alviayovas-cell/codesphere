import { Link } from 'react-router-dom'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center dark:bg-zinc-950">
      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">Page not found</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-6">
        <Button variant="primary">Go home</Button>
      </Link>
    </div>
  )
}
