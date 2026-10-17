import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import Tooltip from './Tooltip'

type Variant = 'ghost' | 'danger' | 'secondary'
type Size = 'sm' | 'md'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name - also rendered as a hover/focus tooltip. */
  label: string
  icon: ReactNode
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  ghost:
    'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white',
  danger: 'text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/50 dark:hover:text-red-400',
  secondary:
    'border border-zinc-300 bg-white text-zinc-600 shadow-xs hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
}

const sizes: Record<Size, string> = {
  sm: 'h-7 w-7 [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'h-8 w-8 [&_svg]:h-4 [&_svg]:w-4',
}

/** Icon-only action button with a built-in tooltip (spec: "tooltips for
 * icon-only buttons"). Used for dense row actions in tables. */
export default function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip label={label}>
      {(tooltipProps) => (
        <button
          type={type}
          aria-label={label}
          disabled={disabled || loading}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            variants[variant],
            sizes[size],
            className,
          )}
          {...tooltipProps}
          {...rest}
        >
          {loading ? (
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            icon
          )}
        </button>
      )}
    </Tooltip>
  )
}
