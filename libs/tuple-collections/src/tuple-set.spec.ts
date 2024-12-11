import { TupleSet } from './tuple-set'; // Assuming TupleSet is exported from a module

describe('TupleSet', () => {
  it('should add a tuple and check its presence', () => {
    const set = new TupleSet<[string, number]>();
    set.add(['foo', 1]);

    expect(set.has(['foo', 1])).toBe(true);
    expect(set.has(['bar', 2])).toBe(false);
  });

  it('should add multiple tuples and ensure uniqueness', () => {
    const set = new TupleSet<[string, number]>();
    set.add(['foo', 1]);
    set.add(['bar', 2]);
    set.add(['foo', 1]); // Add the same tuple again

    expect(set.has(['foo', 1])).toBe(true);
    expect(set.has(['bar', 2])).toBe(true);

    // Ensure there's no duplication by checking the count of values
    const values = [...set.values()];
    expect(values.length).toBe(2); // Should only have 2 unique tuples
  });

  it('should delete a tuple from the set', () => {
    const set = new TupleSet<[string, number]>();
    set.add(['foo', 1]);
    set.add(['bar', 2]);

    expect(set.delete(['foo', 1])).toBe(true);
    expect(set.has(['foo', 1])).toBe(false);

    expect(set.delete(['foo', 1])).toBe(false); // Trying to delete again should return false
    expect(set.has(['bar', 2])).toBe(true); // The other tuple should still exist
  });

  it('should clear the set', () => {
    const set = new TupleSet<[string, number]>();
    set.add(['foo', 1]);
    set.add(['bar', 2]);

    set.clear();
    expect(set.has(['foo', 1])).toBe(false);
    expect(set.has(['bar', 2])).toBe(false);
    expect([...set.values()].length).toBe(0); // Ensure the set is empty
  });

  it('should iterate over all tuples', () => {
    const set = new TupleSet<[string, number]>();
    set.add(['foo', 1]);
    set.add(['bar', 2]);
    set.add(['baz', 3]);

    const values = [...set.values()];

    expect(values).toContainEqual(['foo', 1]);
    expect(values).toContainEqual(['bar', 2]);
    expect(values).toContainEqual(['baz', 3]);

    expect(values.length).toBe(3); // There should be 3 unique tuples
  });

  it.skip('should handle nested tuples', () => {
    const set = new TupleSet<[[string, number], number]>();
    set.add([['foo', 1], 42]);
    set.add([['bar', 2], 100]);

    expect(set.has([['foo', 1], 42])).toBe(true);
    expect(set.has([['bar', 2], 100])).toBe(true);
    expect(set.has([['baz', 3], 999])).toBe(false);
  });
});
