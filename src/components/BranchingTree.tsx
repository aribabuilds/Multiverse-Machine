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
 *
 * The tree can far outgrow the visible canvas, so panning is a first-class
 * interaction (mouse-drag, touch-drag, wheel/pinch-zoom via d3.zoom) rather
 * than relying on a native scrollbar — the only affordance touch devices
 * reliably show. The view auto-follows the active node while generation is
 * in progress, then stays put under full manual control once it's done.
 */
export function BranchingTree({ tree, activeNodeId, onSelectNode, disabled }: BranchingTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const onSelectRef = useRef(onSelectNode)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const reducedMotion = usePrefersReducedMotion()
  const transitionMs = reducedMotion ? 0 : TRANSITION_MS

  useEffect(() => {
    onSelectRef.current = onSelectNode
  }, [onSelectNode])

  // One-time setup: the pan/zoom layer and its interaction behavior persist
  // across renders so a user's manual pan/zoom isn't reset by every re-render.
  useEffect(() => {
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!)
    const zoomLayer = svg.append('g').attr('class', 'zoom-layer')
    zoomLayer.append('g').attr('class', 'canvas')

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        zoomLayer.attr('transform', event.transform.toString())
      })
    svg.call(zoomBehavior)
    zoomRef.current = zoomBehavior

    return () => {
      svg.on('.zoom', null)
      zoomLayer.remove()
      zoomRef.current = null
    }
  }, [])

  useEffect(() => {
    const svg = d3.select<SVGSVGElement, unknown>(svgRef.current!)
    const canvas = svg.select<SVGGElement>('g.zoom-layer g.canvas')
    if (canvas.empty()) return // not mounted yet
    const activePath = getAncestorIds(tree, activeNodeId)

    const root = d3.hierarchy<HierarchyNode>(buildHierarchy(tree))
    const layout = d3.tree<HierarchyNode>().nodeSize([NODE_HEIGHT, NODE_WIDTH])
    const laidOut = layout(root) as D3Node

    let minX = Infinity
    laidOut.each((d) => {
      minX = Math.min(minX, d.x)
    })
    const xOffset = MARGIN.top - minX
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

    // While generating, keep the growing tip in view automatically. Once
    // it's done, leave the camera alone so manual pan/zoom stays in control.
    if (disabled && svgRef.current && zoomRef.current) {
      const activeLaidOutNode = laidOut.descendants().find((d) => d.data.node.id === activeNodeId)
      if (activeLaidOutNode) {
        const { clientWidth, clientHeight } = svgRef.current
        const scale = 1
        const targetX = clientWidth / 2 - scale * (MARGIN.left + activeLaidOutNode.y)
        const targetY = clientHeight / 2 - scale * (xOffset + activeLaidOutNode.x)
        const transform = d3.zoomIdentity.translate(targetX, targetY).scale(scale)
        svg.transition().duration(transitionMs).call(zoomRef.current.transform, transform)
      }
    }
  }, [tree, activeNodeId, disabled, transitionMs])

  return (
    <div className="h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none cursor-grab font-mono text-[13px] active:cursor-grabbing"
      >
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
