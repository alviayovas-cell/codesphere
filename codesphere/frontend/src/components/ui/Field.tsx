import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const controlClass =
  'w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800'

interface FieldWrapperProps {
  label?: string
  error?: string
  hint?: string
  htmlFor: string
  required?: boolean
}

function FieldWrapper({ label, error, hint, htmlFor, required, children }: FieldWrapperProps & { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId} required={rest.required}>
      <input
        ref={ref}
        id={fieldId}
        className={cn(controlClass, 'h-9', error && 'border-red-400 focus:border-red-500 focus:ring-red-500', className)}
        aria-invalid={!!error}
        {...rest}
      />
    </FieldWrapper>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId} required={rest.required}>
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(controlClass, 'py-2 leading-relaxed', error && 'border-red-400 focus:border-red-500 focus:ring-red-500', className)}
        aria-invalid={!!error}
        {...rest}
      />
    </FieldWrapper>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className, children, ...rest },
  ref,
) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <FieldWrapper label={label} error={error} hint={hint} htmlFor={fieldId}>
      <select ref={ref} id={fieldId} className={cn(controlClass, 'h-9', className)} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  )
})
