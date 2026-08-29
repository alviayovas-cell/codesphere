import { LaptopIcon } from '../ui/Icons'

/** Shown instead of the editor below the `md` breakpoint - the coding
 * interface is not usable meaningfully shrunk down (spec: "do not simply
 * shrink the desktop coding interface"). */
export default function MobileEditorNotice() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center md:hidden">
      <LaptopIcon className="mb-3 h-8 w-8 text-zinc-400" />
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        For the best coding experience, please use a laptop or desktop.
      </p>
      <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        The code editor needs more screen space than a phone or small tablet can provide.
      </p>
    </div>
  )
}
