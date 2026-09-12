import { useEffect, useState } from 'react'
import { getHealth } from '../services/api'

type Status = 'checking' | 'online' | 'offline'

export default function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let mounted = true
    const check = () => {
      getHealth()
        .then(() => {
          if (mounted) setStatus('online')
        })
        .catch(() => {
          if (mounted) setStatus('offline')
        })
    }

    check()
    const interval = setInterval(check, 3000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const dot =
    status === 'online' ? 'bg-emerald-500' : status === 'offline' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      Backend: {status}
    </div>
  )
}
