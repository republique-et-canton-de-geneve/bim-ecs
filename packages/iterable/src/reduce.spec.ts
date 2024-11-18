import { describe, it, expect } from 'vitest';
import { reduce } from './reduce.ts'; // Adjust the import path as needed

describe('reduce', () => {
  it('should reduce a Set correctly', () => {
    const mySet = new Set([1, 2, 3, 4]);
    const result = reduce(mySet, (acc, value) => acc + value, 0);
    expect(result).toBe(10);
  });

  it('should reduce a Map correctly', () => {
    const myMap = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    const result = reduce(myMap, (acc, [key, value]) => acc + value, 0);
    expect(result).toBe(6);
  });

  it('should reduce a custom iterable correctly', () => {
    const myIterable = {
      *[Symbol.iterator]() {
        yield 1;
        yield 2;
        yield 3;
      },
    };
    const result = reduce(myIterable, (acc, value) => acc + value, 0);
    expect(result).toBe(6);
  });

  it('should work with different types of accumulators', () => {
    const mySet = new Set(['a', 'b', 'c']);
    const result = reduce(mySet, (acc, value) => acc + value, '');
    expect(result).toBe('abc');
  });
});
