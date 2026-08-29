import { Link } from 'react-router-dom'
import BackendStatus from '../components/BackendStatus'
import Button from '../components/ui/Button'
import { CodeIcon } from '../components/ui/Icons'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
        <CodeIcon className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-3xl font-semibold text-zinc-900 dark:text-white">CodeSphere</h1>
      <p className="mt-2 text-zinc-500 dark:text-zinc-400">CSE Coding Learning &amp; Assessment Platform</p>
      <Link to="/login" className="mt-6">
        <Button variant="primary">Login</Button>
      </Link>
      <div className="mt-6">
        <BackendStatus />
      </div>
    </div>
  )
}
