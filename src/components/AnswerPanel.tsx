import { useState } from 'react'
import { getPathText, type MultiverseTree } from '../lib/tree'

interface AnswerPanelProps {
  tree: MultiverseTree
  activeNodeId: string
}

/**
 * A readable "prompt → answer" readout, separate from the branching tree.
 * The tree is built for showing alternatives, not for reading the sentence
 * at a glance — this fills that gap, and updates live as generation streams.
 * Matches GlassControlPanel's glass styling; sits opposite it (top-left).
 */
export function AnswerPanel({ tree, activeNodeId }: AnswerPanelProps) {
  const [expanded, setExpanded] = useState(true)
  const answer = getPathText(tree, activeNodeId)

  return (
    <div className="flex w-72 flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-lg backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between text-xs font-medium text-ink-dim"
      >
        <span>Prompt & answer</span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-sm leading-none text-ink">
          {expanded ? '−' : '+'}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-2">
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-xs font-medium text-ink-dim">Prompt</p>
            <p className="mt-0.5 text-sm text-ink-dim">{tree.prompt}</p>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-xs font-medium text-ink-dim">Answer</p>
            <p className="mt-0.5 text-sm text-ink">{answer || '…'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
