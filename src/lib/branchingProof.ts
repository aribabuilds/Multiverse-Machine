import { cat, ones, softmax, Tensor } from '@huggingface/transformers'
import type { LoadedModel } from './loadModel'

const HARDCODED_PROMPT = 'Write one sentence about a city that exists in two places at once.'
const TOP_N = 5
const MAX_NEW_TOKENS = 40

type TokenProb = { id: number; prob: number }
type StepCapture = { chosenId: number; alternatives: TokenProb[] }

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

/**
 * M1 proof: generate a hardcoded prompt token by token, greedily, calling
 * the model directly (not the high-level `generate()` helper) so we get full
 * visibility into the next-token distribution at every single step — the
 * chosen token plus its top-N alternatives and real probabilities. No UI —
 * this is purely a console-verifiable proof the mechanic works. This manual,
 * step-at-a-time loop is also the shape M2's engine (timeline switching)
 * will build on.
 */
export async function runBranchingProof({ tokenizer, model, modelId }: LoadedModel): Promise<void> {
  console.log(`%c[M1 proof] model: ${modelId}`, 'color:#7c6cff;font-weight:bold')
  console.log(`[M1 proof] prompt: "${HARDCODED_PROMPT}"`)

  const eosTokenIds = new Set(
    (Array.isArray(model.generation_config?.eos_token_id)
      ? model.generation_config.eos_token_id
      : [model.generation_config?.eos_token_id]
    ).filter((id: unknown): id is number => typeof id === 'number'),
  )

  let { input_ids, attention_mask } = tokenizer.apply_chat_template(
    [{ role: 'user', content: HARDCODED_PROMPT }],
    { add_generation_prompt: true, tokenize: true, return_dict: true },
  ) as { input_ids: Tensor; attention_mask: Tensor }

  const steps: StepCapture[] = []
  const start = performance.now()

  for (let i = 0; i < MAX_NEW_TOKENS; i++) {
    const { logits } = await model({ input_ids, attention_mask })

    const lastLogits = logits.slice(null, -1, null) // [1, vocab]
    const vocabSize = lastLogits.dims[lastLogits.dims.length - 1]
    const row = lastLogits.data.slice(0, vocabSize) as Float32Array
    const probs = softmax(row)
    const alternatives = topAlternatives(probs, TOP_N)
    const chosenId = alternatives[0].id

    steps.push({ chosenId, alternatives })

    if (eosTokenIds.has(chosenId)) break

    input_ids = cat([input_ids, new Tensor('int64', [BigInt(chosenId)], [1, 1])], 1)
    attention_mask = cat([attention_mask, ones([attention_mask.dims[0], 1])], 1)
  }

  const elapsedMs = performance.now() - start
  const generatedIds = steps.map((s) => s.chosenId)
  const fullText = tokenizer.decode(generatedIds, { skip_special_tokens: true })
  console.log(
    `%c[M1 proof] generated ${steps.length} tokens in ${elapsedMs.toFixed(0)}ms: "${fullText}"`,
    'color:#28c840;font-weight:bold',
  )

  const branchingData = steps.map((step, position) => ({
    position,
    chosen: { id: step.chosenId, token: tokenizer.decode([step.chosenId]) },
    alternatives: step.alternatives.map((a) => ({
      id: a.id,
      token: tokenizer.decode([a.id]),
      probability: a.prob,
    })),
  }))

  for (const step of branchingData) {
    const lines = step.alternatives
      .map((a) => {
        const marker = a.id === step.chosen.id ? '→' : ' '
        return `    ${marker} ${JSON.stringify(a.token)} (${(a.probability * 100).toFixed(1)}%)`
      })
      .join('\n')
    console.log(
      `[M1 proof] step ${step.position}: chose ${JSON.stringify(step.chosen.token)}\n${lines}`,
    )
  }

  console.log('[M1 proof] full branching data:', branchingData)
}
