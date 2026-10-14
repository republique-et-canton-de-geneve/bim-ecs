import { describe, it, expect } from 'vitest';
import { serializeValue } from './serialize-value';

describe('serializeValue', () => {
  it('should keep JSON primitives as is', () => {
    expect(serializeValue('foo')).toBe('foo');
    expect(serializeValue(12.5)).toBe(12.5);
    expect(serializeValue(true)).toBe(true);
    expect(serializeValue(null)).toBeNull();
  });

  it('should tag what JSON cannot represent', () => {
    expect(serializeValue(undefined)).toEqual({ $: 'undefined' });
    expect(serializeValue(NaN)).toEqual({ $: 'number', v: 'NaN' });
    expect(serializeValue(-Infinity)).toEqual({ $: 'number', v: '-Infinity' });
    expect(serializeValue(10n)).toEqual({ $: 'bigint', v: '10' });
    expect(serializeValue(Symbol('foo'))).toEqual({ $: 'symbol', v: 'Symbol(foo)' });
    expect(serializeValue(function foo() {})).toEqual({ $: 'function', name: 'foo' });
    expect(serializeValue(new Date('2020-01-02T03:04:05.000Z'))).toEqual({ $: 'date', v: '2020-01-02T03:04:05.000Z' });
  });

  it('should serialize objects with the name of their class', () => {
    class Point {
      constructor(
        public x: number,
        public y: number,
      ) {}
    }

    expect(serializeValue(new Point(1, 2))).toEqual({
      $: 'object',
      cls: 'Point',
      size: 2,
      entries: [
        ['x', 1],
        ['y', 2],
      ],
    });
    expect(serializeValue(Object.create(null))).toEqual({ $: 'object', cls: 'Object', size: 0, entries: [] });
  });

  it('should serialize collections', () => {
    expect(serializeValue([1, 'a'])).toEqual({ $: 'array', size: 2, items: [1, 'a'] });
    expect(serializeValue(new Set([1]))).toEqual({ $: 'set', size: 1, items: [1] });
    expect(serializeValue(new Map([['a', 1]]))).toEqual({ $: 'map', size: 1, entries: [['a', 1]] });
  });

  it('should detect cycles without flagging shared references', () => {
    const shared = { n: 1 };
    const cyclic: any = { shared, again: shared };
    cyclic.self = cyclic;

    expect(serializeValue(cyclic)).toEqual({
      $: 'object',
      cls: 'Object',
      size: 3,
      entries: [
        ['shared', { $: 'object', cls: 'Object', size: 1, entries: [['n', 1]] }],
        ['again', { $: 'object', cls: 'Object', size: 1, entries: [['n', 1]] }],
        ['self', { $: 'circular' }],
      ],
    });
  });

  it('should truncate beyond the maximum depth', () => {
    const value = { a: { b: { c: 1 } } };

    expect(serializeValue(value, { maxDepth: 2 })).toEqual({
      $: 'object',
      cls: 'Object',
      size: 1,
      entries: [['a', { $: 'object', cls: 'Object', size: 1, entries: [['b', { $: 'truncated', cls: 'Object' }]] }]],
    });
  });

  it('should keep the real size of truncated collections', () => {
    const items = Array.from({ length: 10 }, (_, i) => i);

    expect(serializeValue(items, { maxEntries: 3 })).toEqual({ $: 'array', size: 10, items: [0, 1, 2] });
    expect(serializeValue(new Set(items), { maxEntries: 2 })).toEqual({ $: 'set', size: 10, items: [0, 1] });
  });

  it('should cap the cost whatever the shape of the data is', () => {
    // Shared references: tiny in memory, but 10^10 nodes once traversed
    let value: unknown = [1];
    for (let level = 0; level < 10; level++) value = new Array(10).fill(value);
    const count = (node: unknown): number =>
      node !== null && typeof node === 'object' ? 1 + Object.values(node).reduce((sum, v) => sum + count(v), 0) : 1;

    const result = serializeValue(value, { maxDepth: 20, maxNodes: 200 });

    expect(count(result)).toBeLessThan(5000);
  });

  it('should truncate long strings', () => {
    expect(serializeValue('x'.repeat(20), { maxStringLength: 5 })).toBe('xxxxx…');
  });

  it('should not invoke getters', () => {
    let invoked = false;
    const value = {
      get danger() {
        invoked = true;
        return 1;
      },
    };

    expect(serializeValue(value)).toEqual({
      $: 'object',
      cls: 'Object',
      size: 1,
      entries: [['danger', { $: 'opaque', cls: 'Getter' }]],
    });
    expect(invoked).toBe(false);
  });

  it('should not inspect DOM nodes, errors, promises nor weak collections', () => {
    expect(serializeValue(document.createElement('canvas'))).toEqual({
      $: 'opaque',
      cls: 'HTMLCanvasElement',
      desc: 'CANVAS',
    });
    expect(serializeValue(new Error('boom'))).toEqual({ $: 'opaque', cls: 'Error', desc: 'boom' });
    expect(serializeValue(Promise.resolve())).toEqual({ $: 'opaque', cls: 'Promise' });
    expect(serializeValue(new WeakMap())).toEqual({ $: 'opaque', cls: 'WeakMap' });
    expect(serializeValue(new Uint8Array(4))).toEqual({ $: 'opaque', cls: 'Uint8Array', desc: '4 bytes' });
  });

  it('should produce JSON-safe data', () => {
    const value = new Map<unknown, unknown>([
      ['n', NaN],
      [{ k: 1 }, new Set([undefined, 10n])],
    ]);

    const result = serializeValue(value);

    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
