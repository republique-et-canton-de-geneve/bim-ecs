import type { GraphEdge, GraphNode, SystemsGraph } from '@bim-ecs/devtools-protocol';
import { categoryOf, type NodeCategory } from './kind-meta';

/** An edge of the displayed graph: it can stand for a path through nodes which have been hidden */
export interface ViewEdge extends GraphEdge {
  contracted?: boolean;
}

export interface ViewGraph {
  nodes: GraphNode[];
  edges: ViewEdge[];
}

export type RelationMode = 'direct' | 'upstream' | 'downstream' | 'all';

/**
 * Hides the nodes of the given categories while keeping what they connect: a hidden node is replaced by edges from
 * each of its sources to each of its targets. Hiding events gives a "which system triggers which" view.
 */
export function contractGraph(graph: SystemsGraph, hidden: ReadonlySet<NodeCategory>): ViewGraph {
  if (!hidden.size) return { nodes: graph.nodes, edges: graph.edges };

  const hiddenIds = graph.nodes.filter((node) => hidden.has(categoryOf(node.kind))).map((node) => node.id);
  let edges: ViewEdge[] = graph.edges;

  for (const id of hiddenIds) {
    const incoming = edges.filter((edge) => edge.to === id);
    const outgoing = edges.filter((edge) => edge.from === id);
    const kept = edges.filter((edge) => edge.from !== id && edge.to !== id);

    const bypasses = new Map<string, ViewEdge>();
    for (const source of incoming) {
      for (const target of outgoing) {
        if (source.from === target.to) continue;

        // The most specific meaning wins: "after" or "publish" is more informative than a plain schedule
        const kind = source.kind !== 'schedule' ? source.kind : target.kind;
        const bypassId = `${source.from}>${target.to}:${kind}`;
        bypasses.set(bypassId, { id: bypassId, from: source.from, to: target.to, kind, contracted: true });
      }
    }

    const known = new Set(kept.map((edge) => edge.id));
    edges = [...kept, ...[...bypasses.values()].filter((edge) => !known.has(edge.id))];
  }

  const hiddenSet = new Set(hiddenIds);
  return { nodes: graph.nodes.filter((node) => !hiddenSet.has(node.id)), edges };
}

/**
 * Provides the nodes related to a node.
 * @param graph The graph
 * @param id The node
 * @param mode `direct`: neighbours; `upstream`/`downstream`: transitive sources/targets; `all`: both
 */
export function relatedNodes(graph: ViewGraph, id: string, mode: RelationMode): Set<string> {
  const walk = (start: string, next: (nodeId: string) => string[]) => {
    const seen = new Set<string>();
    const pending = [start];
    while (pending.length) {
      for (const neighbour of next(pending.pop()!)) {
        if (!seen.has(neighbour) && neighbour !== start) {
          seen.add(neighbour);
          pending.push(neighbour);
        }
      }
    }
    return seen;
  };

  const sources = new Map<string, string[]>();
  const targets = new Map<string, string[]>();
  for (const edge of graph.edges) {
    (targets.get(edge.from) ?? targets.set(edge.from, []).get(edge.from)!).push(edge.to);
    (sources.get(edge.to) ?? sources.set(edge.to, []).get(edge.to)!).push(edge.from);
  }

  const upstream = () => walk(id, (nodeId) => sources.get(nodeId) ?? []);
  const downstream = () => walk(id, (nodeId) => targets.get(nodeId) ?? []);

  switch (mode) {
    case 'direct':
      return new Set([...(sources.get(id) ?? []), ...(targets.get(id) ?? [])]);
    case 'upstream':
      return upstream();
    case 'downstream':
      return downstream();
    case 'all':
      return new Set([...upstream(), ...downstream()]);
  }
}

/** Provides the nodes whose label, kind or detail contains the text (case insensitive) */
export function matchNodes(nodes: readonly GraphNode[], text: string): Set<string> {
  const needle = text.trim().toLowerCase();
  if (!needle) return new Set();

  return new Set(
    nodes
      .filter((node) => [node.label, node.kind, node.detail].some((part) => part?.toLowerCase().includes(needle)))
      .map((node) => node.id),
  );
}

/** Restricts a graph to some nodes */
export function subgraph(graph: ViewGraph, ids: ReadonlySet<string>): ViewGraph {
  return {
    nodes: graph.nodes.filter((node) => ids.has(node.id)),
    edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
  };
}
