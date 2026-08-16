import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import {
  buildHierarchy,
  getAncestorIds,
  type HierarchyNode,
  type MultiverseTree,
} from '../lib/tree'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

interface BranchingTreeProps {
  tree: MultiverseTree
  activeNodeId: string
  onSelectNode: (nodeId: string) => void
  disabled?: boolean
}

type D3Node = d3.HierarchyPointNode<HierarchyNode>
type D3Link = d3.HierarchyPointLink<HierarchyNode>

const NODE_WIDTH = 130 // horizontal spacing per generation step
const NODE_HEIGHT = 30 // vertical spacing between sibling branches
const MARGIN = { top: 24, right: 60, bottom: 24, left: 16 }
const TRANSITION_MS = 300

/**
 * Renders the multiverse as an animated node-link tree: the currently active
 * path glows solid and bright, every other branch fades to a ghost whose
 * opacity tracks its probability. Depth flows left to right (one column per
 * generated token); siblings fan out vertically at each step.
 */
export function BranchingTree({ tree, activeNodeId, onSelectNode, disabled }: BranchingTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const onSelectRef = useRef(onSelectNode)
  const reducedMotion = usePrefersReducedMotion()
  const transitionMs = reducedMotion ? 0 : TRANSITION_MS

  useEffect(() => {
    onSelectRef.current = onSelectNode
  }, [onSelectNode])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const activePath = getAncestorIds(tree, activeNodeId)

    const root = d3.hierarchy<HierarchyNode>(buildHierarchy(tree))
    const layout = d3.tree<HierarchyNode>().nodeSize([NODE_HEIGHT, NODE_WIDTH])
    const laidOut = layout(root) as D3Node

    let minX = Infinity
    let maxX = -Infinity
    let maxY = 0
    laidOut.each((d) => {
      minX = Math.min(minX, d.x)
      maxX = Math.max(maxX, d.x)
      maxY = Math.max(maxY, d.y)
    })
    const width = maxY + MARGIN.left + MARGIN.right
    const height = maxX - minX + MARGIN.top + MARGIN.bottom
    const xOffset = MARGIN.top - minX

    svg.attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`)

    let canvas = svg.select<SVGGElement>('g.canvas')
    if (canvas.empty()) canvas = svg.append('g').attr('class', 'canvas')
    canvas.attr('transform', `translate(${MARGIN.left}, ${xOffset})`)

    const linkGenerator = d3
      .linkHorizontal<D3Link, D3Node>()
      .x((d) => d.y)
      .y((d) => d.x)

    canvas
      .selectAll<SVGPathElement, D3Link>('path.branch-link')
      .data(laidOut.links(), (d) => d.target.data.node.id)
      .join(
        (enter) =>
          enter
            .append('path')
            .attr('class', 'branch-link')
            .attr('fill', 'none')
            .attr('d', linkGenerator)
            .style('opacity', 0),
        (update) => update,
        (exit) => exit.transition().duration(transitionMs).style('opacity', 0).remove(),
      )
      .transition()
      .duration(transitionMs)
      .attr('d', linkGenerator)
      .attr('stroke', (d) =>
        activePath.has(d.target.data.node.id) ? 'var(--color-cosmic)' : '#7c6cff',
      )
      .attr('stroke-width', (d) => (activePath.has(d.target.data.node.id) ? 2.5 : 1))
      .attr('filter', (d) => (activePath.has(d.target.data.node.id) ? 'url(#branch-glow)' : null))
      .style('opacity', (d) =>
        activePath.has(d.target.data.node.id) ? 1 : 0.12 + 0.5 * d.target.data.node.probability,
      )

    const nodes = laidOut.descendants().filter((d) => d.data.node.id !== tree.rootId)

    const nodeGroups = canvas
      .selectAll<SVGGElement, D3Node>('g.branch-node')
      .data(nodes, (d) => d.data.node.id)
      .join(
        (enter) => {
          const g = enter
            .append('g')
            .attr('class', 'branch-node')
            .attr('transform', (d) => `translate(${d.y}, ${d.x})`)
            .style('opacity', 0)
          g.append('circle').attr('r', 3.5)
          g.append('text').attr('dy', '0.32em').attr('x', 9)
          return g
        },
        (update) => update,
        (exit) => exit.transition().duration(transitionMs).style('opacity', 0).remove(),
      )

    nodeGroups.style('cursor', disabled ? 'default' : 'pointer')
    if (disabled) {
      nodeGroups.on('click', null)
    } else {
      nodeGroups.on('click', (_event: PointerEvent, d: D3Node) =>
        onSelectRef.current(d.data.node.id),
      )
    }

    nodeGroups
      .transition()
      .duration(transitionMs)
      .attr('transform', (d) => `translate(${d.y}, ${d.x})`)
      .style('opacity', 1)

    nodeGroups
      .select<SVGCircleElement>('circle')
      .attr('fill', (d) =>
        activePath.has(d.data.node.id) ? 'var(--color-cosmic)' : 'var(--color-ink-dim)',
      )
      .attr('filter', (d) => (activePath.has(d.data.node.id) ? 'url(#branch-glow)' : null))
      .style('opacity', (d) =>
        activePath.has(d.data.node.id) ? 1 : 0.3 + 0.5 * d.data.node.probability,
      )

    nodeGroups
      .select<SVGTextElement>('text')
      .text((d) => d.data.node.text)
      .attr('fill', (d) =>
        activePath.has(d.data.node.id) ? 'var(--color-ink)' : 'var(--color-ink-dim)',
      )
      .attr('font-weight', (d) => (activePath.has(d.data.node.id) ? 600 : 400))
      .style('opacity', (d) =>
        activePath.has(d.data.node.id) ? 1 : 0.35 + 0.5 * d.data.node.probability,
      )
  }, [tree, activeNodeId, disabled, transitionMs])

  return (
    <div className="h-full w-full overflow-auto">
      <svg ref={svgRef} className="font-mono text-[13px]">
        <defs>
          <filter id="branch-glow" x="-75%" y="-75%" width="250%" height="250%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </div>
  )
}
