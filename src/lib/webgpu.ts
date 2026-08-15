/** Whether this browser exposes the WebGPU API the model needs to run. */
export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}
