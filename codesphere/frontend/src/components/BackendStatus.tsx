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

  const color =
    status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      Backend: {status}
    </div>
  )
}
