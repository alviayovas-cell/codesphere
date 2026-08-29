import { useTheme, type ThemeMode } from '../../context/ThemeContext'
import { cn } from '../../lib/cn'
import { LaptopIcon, MoonIcon, SunIcon } from './Icons'

const options: { value: ThemeMode; label: string; icon: typeof SunIcon }[] = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: LaptopIcon },
]

/** A compact 3-way segmented control for Light / Dark / System. Reusable -
 * used in the top navbar's user menu and on the login page. */
export default function ThemeToggle({ className, showLabels = true }: { className?: string; showLabels?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800',
        className,
      )}
    >
      {options.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
            )}
          >
            <option.icon className="h-3.5 w-3.5" />
            {showLabels && <span>{option.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
