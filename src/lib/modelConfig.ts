/**
 * Locked decision: the model stays small on purpose. A small model is more
 * uncertain, which is what makes the branching visualization dramatic. Do not
 * swap in a bigger model without checking with the project owner first.
 */
export type ModelSpec = {
  id: string
  dtype: 'q4f16' | 'q4' | 'fp16' | 'fp32'
}

export const PRIMARY_MODEL: ModelSpec = {
  id: 'onnx-community/Llama-3.2-1B-Instruct-ONNX',
  // Plain q4 (not q4f16): q4f16 needs the optional WebGPU `shader-f16`
  // feature, which not every adapter exposes (e.g. some software/virtual
  // GPUs on Windows). q4 runs its compute in fp32 and works everywhere.
  dtype: 'q4',
}

export const FALLBACK_MODEL: ModelSpec = {
  id: 'onnx-community/Qwen2.5-0.5B-Instruct',
  dtype: 'q4',
}
