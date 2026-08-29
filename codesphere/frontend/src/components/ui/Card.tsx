import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

/** A plain, low-decoration container. Use sparingly - not every section
 * needs to be a card (spec: "do not put every section inside a card"). */
export default function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
      {...rest}
    />
  )
}
