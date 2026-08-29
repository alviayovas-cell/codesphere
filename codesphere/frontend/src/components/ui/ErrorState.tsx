import Button from './Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

/** For network/load failures. Never surfaces raw stack traces - `message`
 * should already be a clean, user-facing string (ApiError.message). */
export default function ErrorState({ message = 'Unable to load data.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-red-100 bg-red-50/50 px-6 py-10 text-center dark:border-red-950 dark:bg-red-950/20">
      <svg className="mb-2 h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
        />
      </svg>
      <p className="text-sm font-medium text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

/** Inline (non-blocking) error text, for form/action failures. */
export function InlineError({ message }: { message: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
}
