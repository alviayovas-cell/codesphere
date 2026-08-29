import type { ComponentType, ReactNode, SVGProps } from 'react'

interface ActivityItemProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: ReactNode
  meta?: string
  accent?: 'success' | 'primary' | 'warning'
}

const accentClass: Record<NonNullable<ActivityItemProps['accent']>, string> = {
  success: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
}

export default function ActivityItem({ icon: Icon, title, meta, accent = 'primary' }: ActivityItemProps) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accentClass[accent]}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{title}</p>
        {meta && <p className="text-xs text-zinc-400 dark:text-zinc-500">{meta}</p>}
      </div>
    </li>
  )
}
