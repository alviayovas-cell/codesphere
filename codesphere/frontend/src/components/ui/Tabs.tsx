import { cn } from '../../lib/cn'

interface TabsProps<T extends string> {
  tabs: { id: T; label: string; badge?: number }[]
  active: T
  onChange: (id: T) => void
}

export default function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
            active === tab.id
              ? 'border-primary-600 text-primary-700 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {tab.label}
          {typeof tab.badge === 'number' && tab.badge > 0 && (
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
