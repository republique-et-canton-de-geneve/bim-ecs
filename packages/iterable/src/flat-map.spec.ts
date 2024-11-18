import { describe, it, expect } from 'vitest';
import { flatMap } from './flat-map.ts';

describe('flatMap', () => {
  it('should flatten and map the input iterable', () => {
    const numbers = [1, 2, 3];
    const result = flatMap(numbers, (n) => [n, n * 2]);
    expect([...result]).toEqual([1, 2, 2, 4, 3, 6]);
  });

  it('should handle an empty iterable', () => {
    const emptyArray: number[] = [];
    const result = flatMap(emptyArray, (n) => [n, n * 2]);
    expect([...result]).toEqual([]);
  });

  it('should handle a selector that returns an empty iterable', () => {
    const numbers = [1, 2, 3];
    const result = flatMap(numbers, () => []);
    expect([...result]).toEqual([]);
  });

  it('should work with strings as input', () => {
    const words = ['hello', 'world'];
    const result = flatMap(words, (word) => word.split(''));
    expect([...result]).toEqual(['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']);
  });

  it('should work with nested iterables', () => {
    const nested = [[1, 2], [3], [4, 5]];
    const result = flatMap(nested, (arr) => arr);
    expect([...result]).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle non-array iterables', () => {
    function* generateNumbers() {
      yield 1;
      yield 2;
      yield 3;
    }

    const result = flatMap(generateNumbers(), (n) => [n, n * 3]);
    expect([...result]).toEqual([1, 3, 2, 6, 3, 9]);
  });
});
