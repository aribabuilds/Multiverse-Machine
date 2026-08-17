import { useState, type FormEvent } from 'react'
import type { ProgressInfo } from '@huggingface/transformers'
import { useMultiverse } from './hooks/useMultiverse'
import { WindowChrome } from './components/WindowChrome'
import { GlassControlPanel } from './components/GlassControlPanel'
import { BranchingTree } from './components/BranchingTree'
import { AnswerPanel } from './components/AnswerPanel'

const DEFAULT_PROMPT = 'Write one sentence about a city that exists in two places at once.'

function App() {
  const {
    modelStatus,
    modelId,
    progress,
    errorMessage,
    tree,
    activeNodeId,
    isGenerating,
    isBusy,
    params,
    setParams,
    generate,
    continueFrom,
    reset,
    replay,
    reducedMotion,
  } = useMultiverse()

  const [promptDraft, setPromptDraft] = useState(DEFAULT_PROMPT)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  const controlsDisabled = isBusy || modelStatus !== 'ready'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!promptDraft.trim()) {
      setValidationMessage('Type a prompt first.')
      return
    }
    setValidationMessage(null)
    void generate(promptDraft)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-desktop p-6">
      <div className="h-[min(760px,85vh)] w-full max-w-4xl">
        <WindowChrome title="The Multiverse Machine">
          {modelStatus === 'unsupported' ? (
            <UnsupportedMessage />
          ) : (
            <div className="flex h-full flex-col">
              <form
                onSubmit={handleSubmit}
                className="flex shrink-0 items-center gap-2 border-b border-window-border px-4 py-3"
              >
                <input
                  type="text"
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  placeholder="Type a sentence for the model to write…"
                  disabled={controlsDisabled}
                  className="flex-1 rounded-lg border border-window-border bg-black/20 px-3 py-2 text-sm text-ink placeholder:text-ink-dim/60 focus:ring-1 focus:ring-cosmic focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={controlsDisabled}
                  className="rounded-lg bg-cosmic px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isGenerating ? 'Generating…' : 'Generate'}
                </button>
                <button
                  type="button"
                  onClick={() => void replay()}
                  disabled={!tree || isBusy || reducedMotion}
                  title={reducedMotion ? 'Disabled — reduce motion is on' : undefined}
                  className="rounded-lg border border-window-border px-3 py-2 text-sm text-ink-dim transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={!tree || isBusy}
                  className="rounded-lg border border-window-border px-3 py-2 text-sm text-ink-dim transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset
                </button>
              </form>

              {(validationMessage ?? errorMessage) && (
                <p className="shrink-0 bg-red-500/10 px-4 py-1.5 text-xs text-red-300">
                  {validationMessage ?? errorMessage}
                </p>
              )}

              <div className="relative min-h-0 flex-1">
                {modelStatus === 'loading' && <LoadingOverlay progress={progress} />}

                {tree && activeNodeId ? (
                  <>
                    <BranchingTree
                      tree={tree}
                      activeNodeId={activeNodeId}
                      onSelectNode={(nodeId) => void continueFrom(nodeId)}
                      disabled={isBusy}
                    />
                    <div className="absolute top-4 left-4">
                      <AnswerPanel tree={tree} activeNodeId={activeNodeId} />
                    </div>
                  </>
                ) : (
                  modelStatus === 'ready' && <EmptyState />
                )}

                <div className="absolute top-4 right-4 w-56">
                  <GlassControlPanel
                    params={params}
                    onChange={setParams}
                    disabled={controlsDisabled}
                  />
                </div>
              </div>

              <p className="shrink-0 border-t border-window-border px-4 py-2 text-[11px] text-ink-dim/70">
                {modelId ?? 'Loading model…'} · runs entirely in your browser — nothing you type
                ever leaves this device
              </p>
            </div>
          )}
        </WindowChrome>
      </div>
    </div>
  )
}

function LoadingOverlay({ progress }: { progress: ProgressInfo | null }) {
  const label =
    progress?.status === 'progress'
      ? `Downloading ${progress.file}: ${progress.progress.toFixed(0)}%`
      : (progress?.status ?? 'Starting…')
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-window-border border-t-cosmic motion-reduce:animate-none" />
      <p className="text-sm text-ink-dim">{label}</p>
      <p className="max-w-xs text-xs text-ink-dim/60">
        First load downloads and caches the model in your browser — this can take a while.
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-10 text-center">
      <p className="text-ink-dim">Type a prompt and hit Generate to open a multiverse.</p>
    </div>
  )
}

function UnsupportedMessage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-10 text-center">
      <p className="font-medium text-ink">This browser can't run WebGPU.</p>
      <p className="max-w-sm text-sm text-ink-dim">
        The Multiverse Machine runs a language model directly on your GPU, in your browser — no
        servers involved. That needs WebGPU, which isn't available here. Try a recent version of
        Chrome or Edge, and make sure hardware acceleration is turned on.
      </p>
    </div>
  )
}

export default App
