import { TupleMap } from './tuple-map';

interface MyObject {
  name: string;
  value: number;
}

describe('TupleMap', () => {
  let map: TupleMap<[string, number], MyObject>;

  beforeEach(() => {
    map = new TupleMap<[string, number], MyObject>();
  });

  it('should set and get a value', () => {
    const obj: MyObject = { name: 'Test', value: 123 };

    map.set(['foo', 10], obj);
    const result = map.get(['foo', 10]);

    expect(result).toBe(obj);
  });

  it('should return undefined if key does not exist', () => {
    const result = map.get(['nonexistent', 1]);

    expect(result).toBeUndefined();
  });

  it('should correctly report if a key exists', () => {
    map.set(['foo', 10], { name: 'Test', value: 123 });

    expect(map.has(['foo', 10])).toBe(true);
    expect(map.has(['bar', 20])).toBe(false);
  });

  it('should delete a key and its value', () => {
    const obj: MyObject = { name: 'DeleteMe', value: 999 };
    map.set(['bar', 1000], obj);

    const resultBeforeDelete = map.has(['bar', 1000]);
    expect(resultBeforeDelete).toBe(true);

    const deletionResult = map.delete(['bar', 1000]);
    expect(deletionResult).toBe(true);

    const resultAfterDelete = map.has(['bar', 1000]);
    expect(resultAfterDelete).toBe(false);
  });

  it('should return false if deleting a non-existent key', () => {
    const deletionResult = map.delete(['doesNotExist', 404]);
    expect(deletionResult).toBe(false);
  });

  it('should iterate over all key-value pairs with values()', () => {
    const obj1: MyObject = { name: 'Object1', value: 1 };
    const obj2: MyObject = { name: 'Object2', value: 2 };
    const obj3: MyObject = { name: 'Object3', value: 3 };

    map.set(['a', 1], obj1);
    map.set(['b', 2], obj2);
    map.set(['c', 3], obj3);

    const entries = Array.from(map.entries());

    expect(entries).toEqual([
      [['a', 1], obj1],
      [['b', 2], obj2],
      [['c', 3], obj3],
    ]);
  });

  it('should iterate over all values with values()', () => {
    const obj1: MyObject = { name: 'Object1', value: 1 };
    const obj2: MyObject = { name: 'Object2', value: 2 };
    const obj3: MyObject = { name: 'Object3', value: 3 };

    map.set(['a', 1], obj1);
    map.set(['b', 2], obj2);
    map.set(['c', 3], obj3);

    const values = Array.from(map.values());

    expect(values).toEqual([obj1, obj2, obj3]);
  });
});
