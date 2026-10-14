import { Graph, layout } from '@dagrejs/dagre';
import { categoryOf, type NodeCategory } from './kind-meta';
import type { ViewGraph } from './graph-model';

export type Direction = 'LR' | 'TB';
export type Density = 'comfortable' | 'compact';

export interface Point {
  x: number;
  y: number;
}

const SIZES: Record<Density, { system: [number, number]; other: [number, number] }> = {
  comfortable: { system: [210, 54], other: [170, 46] },
  compact: { system: [160, 34], other: [130, 30] },
};

export function nodeSize(category: NodeCategory, density: Density) {
  const [width, height] = SIZES[density][category === 'system' ? 'system' : 'other'];
  return { width, height };
}

/**
 * Computes the positions (top left corner) of the nodes: layered layout following the edges direction.
 * Cycles are tolerated.
 */
export function layoutGraph(graph: ViewGraph, options: { direction: Direction; density: Density }) {
  const g = new Graph();
  g.setGraph({
    rankdir: options.direction,
    nodesep: options.density === 'compact' ? 14 : 26,
    ranksep: options.density === 'compact' ? 44 : 70,
    marginx: 24,
    marginy: 24,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) g.setNode(node.id, nodeSize(categoryOf(node.kind), options.density));
  for (const edge of graph.edges) g.setEdge(edge.from, edge.to);

  layout(g);

  const positions = new Map<string, Point>();
  for (const node of graph.nodes) {
    const { x, y, width, height } = g.node(node.id);
    // Dagre provides centers
    positions.set(node.id, { x: x - width / 2, y: y - height / 2 });
  }
  return positions;
}
