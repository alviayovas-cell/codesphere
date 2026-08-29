import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { controlClass } from './Field'
import { EyeIcon, EyeOffIcon } from './Icons'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
  hint?: string
}

/** A password field with a show/hide toggle. Masked by default. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false)
  const autoId = useId()
  const fieldId = id ?? autoId

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {rest.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type={visible ? 'text' : 'password'}
          className={cn(
            controlClass,
            'h-9 pr-10',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500',
            className,
          )}
          aria-invalid={!!error}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
          tabIndex={0}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 transition-colors hover:text-zinc-600 focus-visible:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  )
})
