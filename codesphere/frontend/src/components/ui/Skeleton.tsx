import { cn } from '../../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800', className)} />
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <Skeleton className="h-4 w-1/3" />
      <div className="mt-3">
        <SkeletonText lines={2} />
      </div>
    </div>
  )
}

export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-6 w-10" />
        </div>
      ))}
    </div>
  )
}
