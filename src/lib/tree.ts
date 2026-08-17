/**
 * The branching data model: every generated token is a node. A node's
 * children are the alternative tokens the model considered at the next
 * step — one of which (`isChosen`) is the one generation actually
 * continued from. Everything else is a ghost branch until someone chooses
 * to continue from it instead.
 */
export interface BranchNode {
  id: string
  tokenId: number
  text: string
  probability: number
  isChosen: boolean
  parentId: string | null
  childIds: string[]
}

export interface MultiverseTree {
  /** Synthetic node with no token, representing "before the first generated token". */
  rootId: string
  nodes: Record<string, BranchNode>
  /** The raw prompt text this tree was started from. Constant for the tree's lifetime. */
  prompt: string
  /** Tokenized (chat-templated) prompt. Constant for the tree's lifetime. */
  promptInputIds: number[]
}

export function createEmptyTree(prompt: string, promptInputIds: number[]): MultiverseTree {
  const rootId = 'root'
  return {
    rootId,
    prompt,
    promptInputIds,
    nodes: {
      [rootId]: {
        id: rootId,
        tokenId: -1,
        text: '',
        probability: 1,
        isChosen: true,
        parentId: null,
        childIds: [],
      },
    },
  }
}

/** Generated token ids from (but not including) the root down to `nodeId`. */
export function getPathTokenIds(tree: MultiverseTree, nodeId: string): number[] {
  const ids: number[] = []
  let current: BranchNode | undefined = tree.nodes[nodeId]
  while (current && current.id !== tree.rootId) {
    ids.unshift(current.tokenId)
    current = current.parentId ? tree.nodes[current.parentId] : undefined
  }
  return ids
}

const SPECIAL_TOKEN_PATTERN = /^<\|.*\|>$/

/** The generated text from the root down to `nodeId`, special tokens (e.g. end-of-turn) omitted. */
export function getPathText(tree: MultiverseTree, nodeId: string): string {
  const parts: string[] = []
  let current: BranchNode | undefined = tree.nodes[nodeId]
  while (current && current.id !== tree.rootId) {
    if (!SPECIAL_TOKEN_PATTERN.test(current.text)) parts.unshift(current.text)
    current = current.parentId ? tree.nodes[current.parentId] : undefined
  }
  return parts.join('')
}

/** Ids of every node from the root down to and including `nodeId`. */
export function getAncestorIds(tree: MultiverseTree, nodeId: string): Set<string> {
  return new Set(getPathNodeIds(tree, nodeId))
}

/** Ordered node ids from the root down to and including `nodeId`. */
export function getPathNodeIds(tree: MultiverseTree, nodeId: string): string[] {
  const ids: string[] = []
  let current: BranchNode | undefined = tree.nodes[nodeId]
  while (current) {
    ids.unshift(current.id)
    current = current.parentId ? tree.nodes[current.parentId] : undefined
  }
  return ids
}

/** Walks down the `isChosen` chain from `nodeId` to find the end of that generated path. */
export function deepestChosenDescendant(tree: MultiverseTree, nodeId: string): string {
  let current = tree.nodes[nodeId]
  while (current.childIds.length > 0) {
    const chosenChildId =
      current.childIds.find((id) => tree.nodes[id].isChosen) ?? current.childIds[0]
    current = tree.nodes[chosenChildId]
  }
  return current.id
}

/** A nested view of the tree, shaped for d3.hierarchy (which expects a `children` array). */
export interface HierarchyNode {
  node: BranchNode
  children: HierarchyNode[]
}

export function buildHierarchy(tree: MultiverseTree, nodeId: string = tree.rootId): HierarchyNode {
  const node = tree.nodes[nodeId]
  return { node, children: node.childIds.map((id) => buildHierarchy(tree, id)) }
}
