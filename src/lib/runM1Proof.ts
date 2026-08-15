import { isWebGpuAvailable } from './webgpu'
import { loadModel } from './loadModel'
import { runBranchingProof } from './branchingProof'

/**
 * M1 checkpoint: load a small model on WebGPU and prove real token-by-token
 * branching data comes out of it. Runs once on app load and logs everything
 * to the console — there is no UI for this yet (that's M2/M3).
 */
export async function runM1Proof(): Promise<void> {
  if (!isWebGpuAvailable()) {
    console.error(
      '[M1 proof] WebGPU is not available in this browser. The Multiverse Machine needs WebGPU ' +
        '(e.g. a recent Chrome or Edge) to run the model in-browser.',
    )
    return
  }

  console.log(
    '[M1 proof] loading model on WebGPU… (first load downloads and caches the model, can take a while)',
  )
  try {
    const loaded = await loadModel((p) => {
      if (p.status === 'progress') {
        console.log(`[M1 proof] downloading ${p.file}: ${p.progress.toFixed(0)}%`)
      } else {
        console.log(`[M1 proof] ${p.status}`, 'file' in p ? p.file : '')
      }
    })
    await runBranchingProof(loaded)
  } catch (err) {
    console.error('[M1 proof] failed to load model or generate:', err)
  }
}
