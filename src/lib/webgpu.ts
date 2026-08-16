/**
 * Whether this browser can actually get a WebGPU adapter — not just whether
 * the API exists. The API can be present but still fail to produce an
 * adapter (hardware acceleration disabled, blocklisted GPU, etc.), and we'd
 * rather catch that before downloading a multi-gigabyte model than after.
 */
export async function isWebGpuAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}
