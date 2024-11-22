import { describe, it, expect } from 'vitest';
import { ArchetypeMaskMap } from './archetype-mask-map';

describe('ArchetypeMaskMap', () => {
  it('should set and get values with identical Uint32Array keys', () => {
    const map = new ArchetypeMaskMap<number>();

    const key1 = new Uint32Array([1, 2, 3]);
    const key2 = new Uint32Array([1, 2, 3]); // Identical to key1 in value

    map.set(key1, 42);

    expect(map.get(key2)).toBe(42); // Should retrieve the value using key2
  });

  it('should distinguish between different Uint32Array keys', () => {
    const map = new ArchetypeMaskMap<number>();

    const key1 = new Uint32Array([1, 2, 3]);
    const key2 = new Uint32Array([4, 5, 6]); // Different from key1

    map.set(key1, 42);

    expect(map.get(key2)).toBeUndefined(); // Should not find key2
  });

  it('should correctly update the value for an existing key', () => {
    const map = new ArchetypeMaskMap<number>();

    const key = new Uint32Array([1, 2, 3]);

    map.set(key, 42);
    map.set(key, 84); // Update value

    expect(map.get(key)).toBe(84); // Should retrieve updated value
  });

  it('should correctly handle deletion of keys', () => {
    const map = new ArchetypeMaskMap<number>();

    const key = new Uint32Array([1, 2, 3]);

    map.set(key, 42);
    expect(map.delete(key)).toBe(true); // Should return true for successful deletion
    expect(map.get(key)).toBeUndefined(); // Key should no longer exist
    expect(map.delete(key)).toBe(false); // Should return false for non-existent key
  });

  it('should correctly report the size of the map', () => {
    const map = new ArchetypeMaskMap<number>();

    expect(map.size).toBe(0);

    const key1 = new Uint32Array([1, 2, 3]);
    const key2 = new Uint32Array([4, 5, 6]);

    map.set(key1, 42);
    map.set(key2, 84);

    expect(map.size).toBe(2);

    map.delete(key1);

    expect(map.size).toBe(1);
  });

  it('should correctly check for the existence of a key', () => {
    const map = new ArchetypeMaskMap<number>();

    const key = new Uint32Array([1, 2, 3]);

    expect(map.has(key)).toBe(false);

    map.set(key, 42);

    expect(map.has(key)).toBe(true);
  });

  it('should return all keys and values', () => {
    const map = new ArchetypeMaskMap<number>();

    const key1 = new Uint32Array([1, 2, 3]);
    const key2 = new Uint32Array([4, 5, 6]);

    map.set(key1, 42);
    map.set(key2, 84);

    expect(Array.from(map.keys())).toEqual([key1, key2]);
    expect(Array.from(map.values())).toEqual([42, 84]);
  });

  it('should clear all entries', () => {
    const map = new ArchetypeMaskMap<number>();

    const key1 = new Uint32Array([1, 2, 3]);
    const key2 = new Uint32Array([4, 5, 6]);

    map.set(key1, 42);
    map.set(key2, 84);

    map.clear();

    expect(map.size).toBe(0);
    expect(map.get(key1)).toBeUndefined();
    expect(map.get(key2)).toBeUndefined();
  });
});
