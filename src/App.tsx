/**
 * M0 placeholder page.
 *
 * This is only the scaffolding checkpoint: a calm, Mac-native window sitting on a
 * dark desktop, previewing the approved visual direction. The branching
 * visualization, controls, and in-browser model all arrive in later milestones.
 */
function App() {
  return (
    <div className="flex min-h-full items-center justify-center bg-desktop p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-window-border bg-window shadow-2xl shadow-black/50">
        {/* Title bar with macOS traffic-light dots */}
        <div className="flex items-center gap-2 border-b border-window-border bg-window-titlebar px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-sm font-medium text-ink-dim">The Multiverse Machine</span>
        </div>

        {/* Window body */}
        <div className="px-10 py-16 text-center">
          <h1 className="bg-gradient-to-r from-ink to-cosmic bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            The Multiverse Machine
          </h1>
          <p className="mx-auto mt-4 max-w-md text-balance text-ink-dim">
            Type a sentence, watch an AI write it word by word, and see every word it{' '}
            <em>almost</em> wrote branch off as faded parallel timelines.
          </p>
          <p className="mt-10 text-xs uppercase tracking-widest text-ink-dim/70">
            M0 · scaffolding · runs entirely in your browser
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
