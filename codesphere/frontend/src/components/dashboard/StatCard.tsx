import type { ComponentType, SVGProps } from 'react'
import { cn } from '../../lib/cn'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  accent?: 'primary' | 'success' | 'warning' | 'secondary'
}

const accentClass: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400',
  success: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  secondary: 'bg-secondary-50 text-secondary-600 dark:bg-secondary-950/40 dark:text-secondary-300',
}

export default function StatCard({ label, value, icon: Icon, accent = 'primary' }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        {Icon && (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', accentClass[accent])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">{value}</p>
    </div>
  )
}
