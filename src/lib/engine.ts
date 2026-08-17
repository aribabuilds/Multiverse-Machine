import { cat, ones, softmax, Tensor, type ProgressInfo } from '@huggingface/transformers'
import { loadModel, type LoadedModel } from './loadModel'
import { createEmptyTree, type BranchNode, type MultiverseTree, getPathTokenIds } from './tree'

export interface GenerationParams {
  /** Softens (>1) or sharpens (<1) the model's next-token distribution before sampling. */
  temperature: number
  /** How many alternative tokens to surface (and sample from) at each step. */
  branchCount: number
  maxNewTokens: number
}

export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.8,
  branchCount: 5,
  maxNewTokens: 40,
}

let cachedModel: LoadedModel | null = null

/** Loads the model once and reuses it for every generation call. */
export async function loadEngineModel(
  onProgress?: (p: ProgressInfo) => void,
): Promise<LoadedModel> {
  if (!cachedModel) {
    cachedModel = await loadModel(onProgress)
  }
  return cachedModel
}

/** Tokenizes a fresh prompt into an empty tree, ready to generate from its root. */
export async function createTree(prompt: string): Promise<MultiverseTree> {
  const { tokenizer } = await loadEngineModel()
  const { input_ids } = tokenizer.apply_chat_template([{ role: 'user', content: prompt }], {
    add_generation_prompt: true,
    tokenize: true,
    return_dict: true,
  }) as { input_ids: Tensor }
  const promptInputIds = (input_ids.tolist()[0] as bigint[]).map(Number)
  return createEmptyTree(prompt, promptInputIds)
}

type TokenProb = { id: number; prob: number }

/** Top-N (id, probability) pairs, sorted descending by probability. */
function topAlternatives(probs: ArrayLike<number>, n: number): TokenProb[] {
  const best: TokenProb[] = []
  for (let id = 0; id < probs.length; id++) {
    const prob = probs[id]
    if (best.length < n) {
      best.push({ id, prob })
      if (best.length === n) best.sort((a, b) => b.prob - a.prob)
    } else if (prob > best[n - 1].prob) {
      best[n - 1] = { id, prob }
      best.sort((a, b) => b.prob - a.prob)
    }
  }
  return best.length < n ? best.sort((a, b) => b.prob - a.prob) : best
}

/** Applies temperature to raw logits, then softmax. */
function temperatureSoftmax(logits: Float32Array, temperature: number): Float32Array {
  const t = Math.max(temperature, 1e-4) // guard against divide-by-zero
  const scaled = new Float32Array(logits.length)
  for (let i = 0; i < logits.length; i++) scaled[i] = logits[i] / t
  return softmax(scaled)
}

/**
 * Weighted-random pick among the alternatives (renormalized so they sum to
 * 1). The token generation actually continues with is always one of the
 * displayed branches — that's the point of the visualization: nothing gets
 * chosen that wasn't shown as a possibility.
 */
function sampleAlternative(alternatives: TokenProb[]): TokenProb {
  const total = alternatives.reduce((sum, a) => sum + a.prob, 0)
  let r = Math.random() * total
  for (const alt of alternatives) {
    r -= alt.prob
    if (r <= 0) return alt
  }
  return alternatives[alternatives.length - 1]
}

function normalizeEosTokenIds(eosTokenId: number | number[] | null | undefined): Set<number> {
  const ids = Array.isArray(eosTokenId) ? eosTokenId : [eosTokenId]
  return new Set(ids.filter((id): id is number => typeof id === 'number'))
}

/**
 * Continues generation from any node in the tree — the root (fresh
 * generation), a previously-chosen node (regenerate), or a ghost
 * alternative (timeline switching). Returns a new tree with that node's
 * subtree replaced by the newly generated one; the input tree is untouched.
 *
 * If `onStep` is given, it's called with an in-progress snapshot of the tree
 * after every generated token, so a UI can animate tokens appearing live
 * instead of waiting for the whole generation to finish.
 *
 * Recomputes the full prefix on every step rather than reusing a KV cache.
 * A cache was tried and measured *slower* end-to-end in testing here — likely
 * this backend's per-tensor-binding overhead outweighing the FLOPs it saves
 * at these short (~40-token) generation lengths — so this simpler form is
 * what's shipping. See the M6 milestone notes before trying that again.
 */
export async function generateFromNode(
  tree: MultiverseTree,
  nodeId: string,
  params: GenerationParams = DEFAULT_GENERATION_PARAMS,
  onStep?: (partialTree: MultiverseTree) => void,
): Promise<MultiverseTree> {
  const { tokenizer, model } = await loadEngineModel()
  const eosTokenIds = normalizeEosTokenIds(model.generation_config?.eos_token_id)

  const allIds = [...tree.promptInputIds, ...getPathTokenIds(tree, nodeId)]
  let input_ids = new Tensor('int64', allIds.map(BigInt), [1, allIds.length])
  let attention_mask = ones([1, allIds.length])

  const nodes: Record<string, BranchNode> = { ...tree.nodes }
  // Regenerating from this node discards whatever subtree it used to have.
  nodes[nodeId] = { ...nodes[nodeId], childIds: [] }
  let parentId = nodeId

  for (let step = 0; step < params.maxNewTokens; step++) {
    const { logits } = await model({ input_ids, attention_mask })
    const lastLogits = logits.slice(null, -1, null) // [1, vocab]
    const vocabSize = lastLogits.dims[lastLogits.dims.length - 1]
    const row = lastLogits.data.slice(0, vocabSize) as Float32Array
    const probs = temperatureSoftmax(row, params.temperature)
    const alternatives = topAlternatives(probs, params.branchCount)
    const chosen = sampleAlternative(alternatives)

    const childIds: string[] = []
    let chosenNodeId = ''
    for (const alt of alternatives) {
      const id = `${parentId}>${step}:${alt.id}`
      const isChosen = alt.id === chosen.id
      nodes[id] = {
        id,
        tokenId: alt.id,
        text: tokenizer.decode([alt.id]),
        probability: alt.prob,
        isChosen,
        parentId,
        childIds: [],
      }
      childIds.push(id)
      if (isChosen) chosenNodeId = id
    }
    nodes[parentId] = { ...nodes[parentId], childIds }
    parentId = chosenNodeId

    onStep?.({ ...tree, nodes: { ...nodes } })

    if (eosTokenIds.has(chosen.id)) break

    input_ids = cat([input_ids, new Tensor('int64', [BigInt(chosen.id)], [1, 1])], 1)
    attention_mask = cat([attention_mask, ones([attention_mask.dims[0], 1])], 1)
  }

  return { ...tree, nodes }
}
