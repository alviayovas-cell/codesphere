import ProgressBar from '../ui/ProgressBar'

interface ProgressCardProps {
  title: string
  completed: number
  total: number
}

export default function ProgressCard({ title, completed, total }: ProgressCardProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="text-sm font-semibold tabular-nums text-primary-700 dark:text-primary-300">{percent}%</p>
      </div>
      <ProgressBar percent={percent} className="mt-3" />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {completed} of {total} topics completed
      </p>
    </div>
  )
}
