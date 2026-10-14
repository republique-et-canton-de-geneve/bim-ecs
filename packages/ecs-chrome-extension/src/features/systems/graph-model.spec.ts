import { describe, expect, it } from 'vitest';
import type { GraphEdge, GraphNode, SystemsGraph } from '@bim-ecs/devtools-protocol';
import { contractGraph, matchNodes, relatedNodes, subgraph } from './graph-model';
import { categoryOf } from './kind-meta';

const node = (id: string, kind = 'system', label = id): GraphNode => ({ id, kind, label });
const edge = (from: string, to: string, kind: GraphEdge['kind'] = 'schedule'): GraphEdge => ({
  id: `${from}>${to}:${kind}`,
  from,
  to,
  kind,
});

/**
 *   startup -> init -publish-> READY -> render
 *                                  READY -> audio
 *   frame -> when -> render
 */
const graph: SystemsGraph = {
  nodes: [
    node('startup', 'startup'),
    node('init'),
    node('READY', 'event'),
    node('render'),
    node('audio'),
    node('frame', 'frame'),
    node('when', 'when'),
  ],
  edges: [
    edge('startup', 'init'),
    edge('init', 'READY', 'publish'),
    edge('READY', 'render'),
    edge('READY', 'audio'),
    edge('frame', 'when'),
    edge('when', 'render'),
  ],
};

describe('categoryOf', () => {
  it('should group kinds in categories and tolerate unknown ones', () => {
    expect(categoryOf('system')).toBe('system');
    expect(categoryOf('component-value-changed')).toBe('component');
    expect(categoryOf('debounce-frame')).toBe('modifier');
    expect(categoryOf('something-from-a-newer-plugin')).toBe('other');
  });
});

describe('contractGraph', () => {
  it('should leave the graph untouched when nothing is hidden', () => {
    expect(contractGraph(graph, new Set())).toEqual({ nodes: graph.nodes, edges: graph.edges });
  });

  it('should connect sources to targets of hidden nodes', () => {
    const view = contractGraph(graph, new Set(['event']));

    expect(view.nodes.map((n) => n.id)).not.toContain('READY');
    expect(view.edges.filter((e) => e.contracted).map((e) => `${e.from}>${e.to}:${e.kind}`)).toEqual([
      'init>render:publish',
      'init>audio:publish',
    ]);
  });

  it('should chain through consecutive hidden nodes', () => {
    const view = contractGraph(graph, new Set(['trigger', 'modifier']));

    expect(view.edges.map((e) => `${e.from}>${e.to}`)).toEqual(
      expect.arrayContaining(['init>READY', 'READY>render', 'READY>audio']),
    );
    // frame -> when -> render collapses to nothing connected to a visible source: frame is hidden too
    expect(view.nodes.map((n) => n.id).sort()).toEqual(['READY', 'audio', 'init', 'render']);
    expect(
      view.edges.every((e) => view.nodes.some((n) => n.id === e.from) && view.nodes.some((n) => n.id === e.to)),
    ).toBe(true);
  });

  it('should keep the most specific kind of a bypassed path', () => {
    const afterGraph: SystemsGraph = {
      nodes: [node('a'), node('junction', 'after'), node('b')],
      edges: [edge('a', 'junction', 'after'), edge('junction', 'b')],
    };

    expect(contractGraph(afterGraph, new Set(['modifier'])).edges).toEqual([
      expect.objectContaining({ from: 'a', to: 'b', kind: 'after', contracted: true }),
    ]);
  });

  it('should not create self loops nor duplicates', () => {
    const loop: SystemsGraph = {
      nodes: [node('a'), node('e', 'event')],
      edges: [edge('a', 'e', 'publish'), edge('e', 'a')],
    };

    expect(contractGraph(loop, new Set(['event'])).edges).toEqual([]);
  });
});

describe('relatedNodes', () => {
  const related = (id: string, mode: Parameters<typeof relatedNodes>[2]) => [...relatedNodes(graph, id, mode)].sort();

  it('should provide direct neighbours', () => {
    expect(related('READY', 'direct')).toEqual(['audio', 'init', 'render']);
  });

  it('should provide what leads to a node', () => {
    expect(related('render', 'upstream')).toEqual(['READY', 'frame', 'init', 'startup', 'when']);
  });

  it('should provide what a node leads to', () => {
    expect(related('init', 'downstream')).toEqual(['READY', 'audio', 'render']);
  });

  it('should provide both directions, and not the node itself', () => {
    // frame and when lead to render, which READY leads to: they are neither upstream nor downstream of READY
    expect(related('READY', 'all')).toEqual(['audio', 'init', 'render', 'startup']);
  });

  it('should survive cycles', () => {
    const cyclic: SystemsGraph = { nodes: [node('a'), node('b')], edges: [edge('a', 'b'), edge('b', 'a')] };

    expect([...relatedNodes(cyclic, 'a', 'all')]).toEqual(['b']);
  });
});

describe('matchNodes', () => {
  it('should match label, kind and detail whatever the case is', () => {
    const nodes = [
      node('1', 'system', 'Collision detection'),
      node('2', 'event', 'COLLISION'),
      { ...node('3', 'entity-spawned', 'Brick'), detail: 'without Frozen' },
    ];

    expect([...matchNodes(nodes, 'collision')]).toEqual(['1', '2']);
    expect([...matchNodes(nodes, 'frozen')]).toEqual(['3']);
    expect([...matchNodes(nodes, 'spawned')]).toEqual(['3']);
  });

  it('should match nothing when the text is empty', () => {
    expect(matchNodes(graph.nodes, '  ').size).toBe(0);
  });
});

describe('subgraph', () => {
  it('should keep the edges between the kept nodes only', () => {
    const result = subgraph(graph, new Set(['init', 'READY', 'render']));

    expect(result.nodes.map((n) => n.id)).toEqual(['init', 'READY', 'render']);
    expect(result.edges.map((e) => `${e.from}>${e.to}`)).toEqual(['init>READY', 'READY>render']);
  });
});
