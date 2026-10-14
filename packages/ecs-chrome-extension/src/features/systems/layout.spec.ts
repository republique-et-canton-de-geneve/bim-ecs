import { describe, expect, it } from 'vitest';
import { layoutGraph } from './layout';
import type { ViewGraph } from './graph-model';

const graph: ViewGraph = {
  nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, kind: 'system', label: id })),
  edges: [
    { id: 'a>b', from: 'a', to: 'b', kind: 'schedule' },
    { id: 'b>c', from: 'b', to: 'c', kind: 'schedule' },
    { id: 'a>d', from: 'a', to: 'd', kind: 'schedule' },
  ],
};

describe('layoutGraph', () => {
  it('should position every node', () => {
    const positions = layoutGraph(graph, { direction: 'LR', density: 'comfortable' });

    expect([...positions.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);
    for (const { x, y } of positions.values()) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('should flow left to right', () => {
    const p = layoutGraph(graph, { direction: 'LR', density: 'comfortable' });

    expect(p.get('a')!.x).toBeLessThan(p.get('b')!.x);
    expect(p.get('b')!.x).toBeLessThan(p.get('c')!.x);
  });

  it('should flow top to bottom', () => {
    const p = layoutGraph(graph, { direction: 'TB', density: 'comfortable' });

    expect(p.get('a')!.y).toBeLessThan(p.get('b')!.y);
    expect(p.get('b')!.y).toBeLessThan(p.get('c')!.y);
  });

  it('should be more compact in compact density', () => {
    const extent = (density: 'comfortable' | 'compact') => {
      const xs = [...layoutGraph(graph, { direction: 'LR', density }).values()].map((p) => p.x);
      return Math.max(...xs) - Math.min(...xs);
    };

    expect(extent('compact')).toBeLessThan(extent('comfortable'));
  });

  it('should tolerate cycles and an empty graph', () => {
    const cyclic: ViewGraph = {
      nodes: graph.nodes,
      edges: [...graph.edges, { id: 'c>a', from: 'c', to: 'a', kind: 'schedule' }],
    };

    expect(layoutGraph(cyclic, { direction: 'LR', density: 'compact' }).size).toBe(4);
    expect(layoutGraph({ nodes: [], edges: [] }, { direction: 'LR', density: 'compact' }).size).toBe(0);
  });
});
