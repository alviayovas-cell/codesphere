import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Set true for critical, non-dismissible notices (e.g. auto-submit
   * confirmation) - hides the close affordances. */
  blocking?: boolean
}

export default function Modal({ open, onClose, title, children, footer, blocking = false }: ModalProps) {
  useEffect(() => {
    if (!open || blocking) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, blocking, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
        onClick={blocking ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-base font-semibold text-zinc-900 dark:text-white">
            {title}
          </h2>
          {!blocking && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
