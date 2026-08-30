import { cn } from '../../lib/cn'

export interface RankedBarItem {
  key: string
  label: string
  value: number
  /** Rendered after the value, e.g. "(12/18)". */
  detail?: string
  /** Extra context for the native hover tooltip - exact counts, etc. */
  tooltip?: string
  barClassName?: string
}

interface RankedBarListProps {
  items: RankedBarItem[]
  /** Max value the bars scale against - defaults to the largest item's value. */
  max?: number
  /** Formats the value shown at the bar's end, e.g. (v) => `${v}%`. */
  formatValue?: (value: number) => string
  emptyMessage?: string
}

const DEFAULT_BAR_CLASS = 'bg-primary-500 dark:bg-primary-400'

export default function RankedBarList({ items, max, formatValue, emptyMessage }: RankedBarListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyMessage ?? 'No data yet.'}</p>
  }

  const scale = max ?? Math.max(...items.map((i) => i.value), 1)
  const format = formatValue ?? ((v: number) => `${v}%`)

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const widthPercent = scale > 0 ? Math.min(100, Math.max(0, (item.value / scale) * 100)) : 0
        return (
          <li key={item.key} className="flex items-center gap-3" title={item.tooltip}>
            <span className="w-32 shrink-0 truncate text-sm text-zinc-700 dark:text-zinc-300" title={item.label}>
              {item.label}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <span
                className={cn('block h-full rounded-full transition-[width]', item.barClassName ?? DEFAULT_BAR_CLASS)}
                style={{ width: `${widthPercent}%` }}
              />
            </span>
            <span className="w-20 shrink-0 text-right text-sm font-medium text-zinc-900 dark:text-white">
              {format(item.value)}
              {item.detail && <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-500">{item.detail}</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
