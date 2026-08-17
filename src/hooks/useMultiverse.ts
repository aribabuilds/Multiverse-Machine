import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProgressInfo } from '@huggingface/transformers'
import {
  createTree,
  generateFromNode,
  loadEngineModel,
  DEFAULT_GENERATION_PARAMS,
  type GenerationParams,
} from '../lib/engine'
import { deepestChosenDescendant, getPathNodeIds, type MultiverseTree } from '../lib/tree'
import { isWebGpuAvailable } from '../lib/webgpu'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export type ModelStatus = 'unsupported' | 'loading' | 'ready' | 'error'

const REPLAY_STEP_MS = 220

/**
 * Owns the model, the current tree, and the "where is the user looking
 * right now" pointer, and exposes the actions the UI drives: generate a
 * fresh multiverse, switch to any branch (ghost or already-explored), reset,
 * and replay the current path from the start.
 */
export function useMultiverse() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [modelId, setModelId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [tree, setTree] = useState<MultiverseTree | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReplaying, setIsReplaying] = useState(false)
  const [params, setParams] = useState<GenerationParams>(DEFAULT_GENERATION_PARAMS)
  // Generating and replaying both mean "don't let the user start something
  // else, and let the view follow activeNodeId around" — but only
  // generating gets its own button label ("Generating…").
  const isBusy = isGenerating || isReplaying

  // Guards against overlapping calls from rapid clicks without waiting on a state update.
  const isBusyRef = useRef(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (modelStatus !== 'loading') return
    let cancelled = false
    void (async () => {
      // Check before downloading a multi-gigabyte model that turns out unusable.
      if (!(await isWebGpuAvailable())) {
        if (!cancelled) setModelStatus('unsupported')
        return
      }
      try {
        const { modelId: id } = await loadEngineModel((p) => {
          if (!cancelled) setProgress(p)
        })
        if (cancelled) return
        setModelId(id)
        setModelStatus('ready')
      } catch (err) {
        if (cancelled) return
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setModelStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [modelStatus])

  const generate = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim()
      if (!trimmed || isBusyRef.current || modelStatus !== 'ready') return
      isBusyRef.current = true
      setIsGenerating(true)
      setErrorMessage(null)
      try {
        const fresh = await createTree(trimmed)
        setTree(fresh)
        setActiveNodeId(fresh.rootId)
        const finished = await generateFromNode(fresh, fresh.rootId, params, (partial) => {
          setTree(partial)
          setActiveNodeId(deepestChosenDescendant(partial, partial.rootId))
        })
        setTree(finished)
        setActiveNodeId(deepestChosenDescendant(finished, finished.rootId))
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err))
      } finally {
        isBusyRef.current = false
        setIsGenerating(false)
      }
    },
    [modelStatus, params],
  )

  const continueFrom = useCallback(
    async (nodeId: string) => {
      if (!tree || isBusyRef.current || modelStatus !== 'ready') return
      isBusyRef.current = true
      setIsGenerating(true)
      setErrorMessage(null)
      try {
        const finished = await generateFromNode(tree, nodeId, params, (partial) => {
          setTree(partial)
          setActiveNodeId(deepestChosenDescendant(partial, nodeId))
        })
        setTree(finished)
        setActiveNodeId(deepestChosenDescendant(finished, nodeId))
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : String(err))
      } finally {
        isBusyRef.current = false
        setIsGenerating(false)
      }
    },
    [tree, modelStatus, params],
  )

  const reset = useCallback(() => {
    if (isBusyRef.current) return
    setTree(null)
    setActiveNodeId(null)
    setErrorMessage(null)
  }, [])

  /**
   * Re-traces the currently active path from the root, one node at a time.
   * Replay's whole purpose is that animated retrace, so with reduced motion
   * preferred it's a no-op rather than an instant, motion-free version of
   * itself — there's nothing meaningful left to show.
   */
  const replay = useCallback(async () => {
    if (!tree || !activeNodeId || isBusyRef.current || reducedMotion) return
    const path = getPathNodeIds(tree, activeNodeId)
    isBusyRef.current = true
    setIsReplaying(true)
    try {
      for (const id of path) {
        setActiveNodeId(id)
        await new Promise((resolve) => setTimeout(resolve, REPLAY_STEP_MS))
      }
    } finally {
      isBusyRef.current = false
      setIsReplaying(false)
    }
  }, [tree, activeNodeId, reducedMotion])

  return {
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
  }
}
