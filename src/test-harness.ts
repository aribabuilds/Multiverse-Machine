import { createTree, generateFromNode, loadEngineModel, type GenerationParams } from './lib/engine'
import { deepestChosenDescendant, getPathText, type MultiverseTree } from './lib/tree'

const statusEl = document.getElementById('status') as HTMLParagraphElement
const formEl = document.getElementById('form') as HTMLFormElement
const promptEl = document.getElementById('prompt') as HTMLInputElement
const temperatureEl = document.getElementById('temperature') as HTMLInputElement
const branchCountEl = document.getElementById('branchCount') as HTMLInputElement
const maxNewTokensEl = document.getElementById('maxNewTokens') as HTMLInputElement
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement
const activePathEl = document.getElementById('activePath') as HTMLPreElement
const treeEl = document.getElementById('tree') as HTMLDivElement

let tree: MultiverseTree | null = null
let activeNodeId: string | null = null

function readParams(): GenerationParams {
  return {
    temperature: Number(temperatureEl.value) || 0.8,
    branchCount: Math.max(1, Number(branchCountEl.value) || 5),
    maxNewTokens: Math.max(1, Number(maxNewTokensEl.value) || 40),
  }
}

function setStatus(text: string): void {
  statusEl.textContent = text
}

function render(): void {
  treeEl.innerHTML = ''
  if (!tree) return

  activePathEl.textContent = activeNodeId ? JSON.stringify(getPathText(tree, activeNodeId)) : ''

  const renderNode = (nodeId: string): HTMLLIElement => {
    const node = tree!.nodes[nodeId]
    const li = document.createElement('li')

    const label = document.createElement('span')
    const marker = node.isChosen ? '● ' : '○ '
    label.textContent = `${marker}${JSON.stringify(node.text)} (${(node.probability * 100).toFixed(1)}%)`
    if (node.isChosen) label.style.fontWeight = 'bold'
    li.appendChild(label)

    const continueBtn = document.createElement('button')
    continueBtn.type = 'button'
    continueBtn.textContent = 'continue from here'
    continueBtn.style.marginLeft = '8px'
    continueBtn.addEventListener('click', () => void continueFrom(nodeId))
    li.appendChild(continueBtn)

    if (node.childIds.length > 0) {
      const ul = document.createElement('ul')
      for (const childId of node.childIds) ul.appendChild(renderNode(childId))
      li.appendChild(ul)
    }

    return li
  }

  const rootUl = document.createElement('ul')
  for (const childId of tree.nodes[tree.rootId].childIds) rootUl.appendChild(renderNode(childId))
  treeEl.appendChild(rootUl)
}

async function continueFrom(nodeId: string): Promise<void> {
  if (!tree) return
  setStatus('Generating…')
  generateBtn.disabled = true
  try {
    tree = await generateFromNode(tree, nodeId, readParams())
    activeNodeId = deepestChosenDescendant(tree, nodeId)
    render()
    setStatus('Model ready.')
  } catch (err) {
    setStatus(`Generation failed: ${err instanceof Error ? err.message : String(err)}`)
    console.error(err)
  } finally {
    generateBtn.disabled = false
  }
}

formEl.addEventListener('submit', (e) => {
  e.preventDefault()
  void (async () => {
    setStatus('Generating…')
    generateBtn.disabled = true
    try {
      tree = await createTree(promptEl.value)
      tree = await generateFromNode(tree, tree.rootId, readParams())
      activeNodeId = deepestChosenDescendant(tree, tree.rootId)
      render()
      setStatus('Model ready.')
    } catch (err) {
      setStatus(`Generation failed: ${err instanceof Error ? err.message : String(err)}`)
      console.error(err)
    } finally {
      generateBtn.disabled = false
    }
  })()
})

resetBtn.addEventListener('click', () => {
  tree = null
  activeNodeId = null
  render()
  activePathEl.textContent = ''
})

setStatus('Loading model on WebGPU… (first load downloads and caches the model, can take a while)')
loadEngineModel((p) => {
  if (p.status === 'progress') {
    setStatus(`Downloading ${p.file}: ${p.progress.toFixed(0)}%`)
  } else {
    setStatus(p.status)
  }
})
  .then(({ modelId }) => {
    setStatus(`Model ready: ${modelId}`)
    generateBtn.disabled = false
  })
  .catch((err: unknown) => {
    setStatus(`Failed to load model: ${err instanceof Error ? err.message : String(err)}`)
    console.error(err)
  })
