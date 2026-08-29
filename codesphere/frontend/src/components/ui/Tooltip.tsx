import { useId, useState, type ReactNode } from 'react'

/** Wraps an icon-only trigger with an accessible tooltip (spec: "Tooltips
 * for icon-only buttons"). The trigger must forward `aria-describedby`. */
export default function Tooltip({ label, children }: { label: string; children: (props: { 'aria-describedby': string }) => ReactNode }) {
  const [visible, setVisible] = useState(false)
  const id = useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children({ 'aria-describedby': id })}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white shadow-sm dark:bg-zinc-700"
        >
          {label}
        </span>
      )}
    </span>
  )
}
