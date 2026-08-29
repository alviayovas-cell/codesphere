import { cn } from '../../lib/cn'

export default function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800', className)}
    >
      <div className="h-full rounded-full bg-primary-600 transition-all duration-300" style={{ width: `${clamped}%` }} />
    </div>
  )
}
