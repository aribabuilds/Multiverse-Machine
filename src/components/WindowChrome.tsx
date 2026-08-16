import type { ReactNode } from 'react'

interface WindowChromeProps {
  title: string
  children: ReactNode
}

/** A dark, macOS-style app window: traffic-light dots, title bar, rounded corners. */
export function WindowChrome({ title, children }: WindowChromeProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-window-border bg-window shadow-2xl shadow-black/50">
      <div className="flex shrink-0 items-center gap-2 border-b border-window-border bg-window-titlebar px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-sm font-medium text-ink-dim">{title}</span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  )
}
