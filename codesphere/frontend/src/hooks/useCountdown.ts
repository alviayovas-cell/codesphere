import { useEffect, useState } from 'react'

/** Ticks a remaining-seconds value down locally every second, for smooth
 * display between server resyncs. The server (RoundSession.expiresAt) is
 * always the authority - this is purely a display convenience. */
export function useCountdown(initialSeconds: number): number {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => Math.max(s - 1, 0)), 1000)
    return () => clearInterval(timer)
  }, [])

  return seconds
}

export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}
