import { describe, it, expect, beforeEach } from "vitest";
import { EntitiesByComponentRepository } from "./entities-by-component-repository";
import { EcsIndexedComponent } from '../../components';

class FooComponent extends EcsIndexedComponent<string> {}
class BarComponent  extends EcsIndexedComponent<number> {}

describe("EntitiesByComponentRepository", () => {
  let repo: EntitiesByComponentRepository;

  beforeEach(() => {
    repo = new EntitiesByComponentRepository();
  });

  it("returns undefined for non-existing key", () => {
    expect(repo.get([FooComponent, "valueX"])).toBeUndefined();
  });

  it("adds and retrieves values for individual keys", () => {
    repo.set([FooComponent, "value1"], new Set([1, 2, 3]));
    expect(repo.get([FooComponent, "value1"])).toEqual(new Set([1, 2, 3]));
  });

  it("adds and retrieves values for individual keys - using number", () => {
    repo.set([FooComponent, 55], new Set([1, 2, 3]));
    expect(repo.get([FooComponent, 55])).toEqual(new Set([1, 2, 3]));
  });

  it("adds and retrieves values for grouped keys", () => {
    const sharedSet = new Set([4, 5]);
    repo.set([FooComponent, ["value2", "value3"]], sharedSet);
    expect(repo.get([FooComponent, "value2"])).toBe(sharedSet);
    expect(repo.get([FooComponent, "value3"])).toBe(sharedSet);
  });

  it("adds a new key to an existing group via addKeyValue", () => {
    const set1 = new Set([10, 20]);
    repo.set([FooComponent, "value1"], set1);
    repo.addKeyValue(FooComponent, "value1Alias");

    expect(repo.get([FooComponent, "value1Alias"])).toBe(set1);
    expect(repo.get([FooComponent, "value1"])).toBe(set1);
    expect(repo.get([FooComponent, "value11"])).toBeUndefined();
  });

  it("adds a new key to an existing group via addKeyValue - using number", () => {
    const set1 = new Set([10, 20]);
    repo.set([FooComponent, 100], set1);
    repo.addKeyValue(FooComponent, 200);

    expect(repo.get([FooComponent, 200])).toBe(set1);
    expect(repo.get([FooComponent, 100])).toBe(set1);
    expect(repo.get([FooComponent, 50])).toBeUndefined();
  });

  it("does not link to unrelated types", () => {
    const totoSet = new Set([99]);
    repo.set([FooComponent, "totoKey"], totoSet);
    repo.addKeyValue(BarComponent, "tataKey");

    expect(repo.get([BarComponent, "tataKey"])).toBeUndefined();
  });

  it("can extend an existing group with multiple keys", () => {
    const shared = new Set([7]);
    repo.set([FooComponent, ["v1", "v2"]], shared);
    repo.addKeyValue(FooComponent, "v3");

    expect(repo.get([FooComponent, "v3"])).toBe(shared);
  });

  it("deletes a key and removes from group", () => {
    const set = new Set([1]);
    repo.set([FooComponent, ["a", "b"]], set);

    expect(repo.get([FooComponent, "a"])).toBe(set);
    expect(repo.get([FooComponent, "b"])).toBe(set);

    repo.delete([FooComponent, "b"]);
    expect(repo.get([FooComponent, "b"])).toBeUndefined();
    expect(repo.get([FooComponent, "a"])).toBe(set);
  });

  it("deletes a key alias via deleteKeyValue", () => {
    const set = new Set([1, 2]);
    repo.set([FooComponent, "main"], set);
    repo.addKeyValue(FooComponent, "alias");

    expect(repo.get([FooComponent, "alias"])).toEqual(set);
    repo.deleteKeyValue(FooComponent, "alias");
    expect(repo.get([FooComponent, "alias"])).toBeUndefined();
  });

  it('returns correct entries after single set', () => {
    const set = new Set([1, 2]);
    repo.set([FooComponent, "value1"], set);

    const entries = Array.from(repo.entries());
    expect(entries.length).toBe(1);
    expect(entries[0][0]).toEqual([FooComponent, "value1"]);
    expect(entries[0][1]).toBe(set);
  });

  it('returns entries for multiple grouped values', () => {
    const sharedSet = new Set([3, 4]);
    repo.set([FooComponent, ["value1", "value2"]], sharedSet);

    const entries = Array.from(repo.entries());
    expect(entries.length).toBe(2);

    const keys = entries.map(([key]) => key);
    expect(keys).toContainEqual([FooComponent, "value1"]);
    expect(keys).toContainEqual([FooComponent, "value2"]);

    for (const [, set] of entries) {
      expect(set).toBe(sharedSet);
    }
  });

  it('returns all entries for multiple component types', () => {
    const setA = new Set([10]);
    const setB = new Set([20, 30]);

    repo.set([FooComponent, "a"], setA);
    repo.set([BarComponent, "b"], setB);

    const entries = Array.from(repo.entries());
    expect(entries.length).toBe(2);
    expect(entries).toContainEqual([[FooComponent, "a"], setA]);
    expect(entries).toContainEqual([[BarComponent, "b"], setB]);
  });

  it('does not include deleted entries', () => {
    const set = new Set([99]);
    repo.set([FooComponent, "removeMe"], set);
    repo.set([FooComponent, "keepMe"], set);

    repo.delete([FooComponent, "removeMe"]);

    const entries = Array.from(repo.entries());
    expect(entries.length).toBe(1);
    expect(entries[0][0]).toEqual([FooComponent, "keepMe"]);
  });

  it('handles object values as keys correctly', () => {
    const objKey1 = { id: 1 };
    const objKey2 = { id: 2 };
    const set = new Set([1]);

    repo.set([BarComponent, [objKey1, objKey2]], set);

    const entries = Array.from(repo.entries());
    expect(entries.length).toBe(2);

    // Use the same object references in comparison
    const keys = entries.map(([key]) => key[1]);
    expect(keys).toContain(objKey1);
    expect(keys).toContain(objKey2);
  });
});
