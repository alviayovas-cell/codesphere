import ProgressBar from '../ui/ProgressBar'

interface ProgressCardProps {
  title: string
  completed: number
  total: number
}

export default function ProgressCard({ title, completed, total }: ProgressCardProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">{percent}%</p>
      </div>
      <ProgressBar percent={percent} className="mt-2" />
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {completed} of {total} topics completed
      </p>
    </div>
  )
}
