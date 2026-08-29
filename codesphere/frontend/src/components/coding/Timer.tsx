import { formatCountdown } from '../../hooks/useCountdown'
import { cn } from '../../lib/cn'

export default function Timer({ seconds, className }: { seconds: number; className?: string }) {
  const low = seconds > 0 && seconds <= 5 * 60
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm font-medium tabular-nums',
        low
          ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900',
        className,
      )}
      aria-live="polite"
    >
      {formatCountdown(seconds)}
    </span>
  )
}
