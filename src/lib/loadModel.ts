import { AutoModelForCausalLM, AutoTokenizer, type ProgressInfo } from '@huggingface/transformers'
import { FALLBACK_MODEL, PRIMARY_MODEL, type ModelSpec } from './modelConfig'

export type Tokenizer = Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
export type CausalLM = Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>>

export type LoadedModel = {
  modelId: string
  tokenizer: Tokenizer
  model: CausalLM
}

/**
 * Loads the primary small model on WebGPU, falling back to the smaller
 * fallback model if the primary fails to load (e.g. the browser can't fetch
 * or run it). Never falls back to a *bigger* model.
 */
export async function loadModel(onProgress?: (p: ProgressInfo) => void): Promise<LoadedModel> {
  try {
    return await loadSpec(PRIMARY_MODEL, onProgress)
  } catch (err) {
    console.warn(
      `[model] Failed to load primary model "${PRIMARY_MODEL.id}", falling back to "${FALLBACK_MODEL.id}".`,
      err,
    )
    return await loadSpec(FALLBACK_MODEL, onProgress)
  }
}

async function loadSpec(
  spec: ModelSpec,
  onProgress?: (p: ProgressInfo) => void,
): Promise<LoadedModel> {
  const [tokenizer, model] = await Promise.all([
    AutoTokenizer.from_pretrained(spec.id, { progress_callback: onProgress }),
    AutoModelForCausalLM.from_pretrained(spec.id, {
      dtype: spec.dtype,
      device: 'webgpu',
      progress_callback: onProgress,
    }),
  ])

  return { modelId: spec.id, tokenizer, model }
}
