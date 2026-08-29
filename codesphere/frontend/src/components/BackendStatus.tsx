import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

type Status = 'checking' | 'online' | 'offline'

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    getHealth()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'))
  }, [])

  const dot =
    status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      Backend: {status}
    </div>
  )
}
