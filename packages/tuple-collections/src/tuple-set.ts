/**
 * TupleSet is a strongly-typed Set-like data structure where tuples of varying lengths
 * and types can be stored as unique entries. It uses nested Maps to represent each element of the tuple.
 *
 * @template K - The tuple type used as the key.
 */
export class TupleSet<K extends any[]> implements Iterable<K> {
  // The root map that will contain nested maps for each tuple key.
  private root = new Map<any, any>();

  /**
   * Constructs a new TupleSet. Optionally, accepts an iterable of tuples to initialize the set with.
   * @param entries - An iterable of tuples to initialize the set with.
   */
  constructor(entries?: Iterable<K> | TupleSet<K>) {
    if (entries) {
      for (const key of entries) {
        this.add(key);
      }
    }
  }

  /**
   * Adds a tuple to the set.
   * @param key - The tuple to add.
   * @returns The current instance of TupleSet (to allow for method chaining).
   */
  add(key: K) {
    let currentMap = this.root;
    // Traverse through the nested maps based on each tuple element.
    for (let i = 0; i < key.length; i++) {
      if (!currentMap.has(key[i])) {
        currentMap.set(key[i], new Map());
      }
      currentMap = currentMap.get(key[i]);
    }
    // Mark the presence of the tuple by setting a special symbol at the final position.
    currentMap.set(TupleSet.PRESENCE_MARKER, true);
    return this;
  }

  /**
   * Checks whether the tuple exists in the set.
   * @param key - The tuple to check.
   * @returns True if the tuple exists, otherwise false.
   */
  has(key: K) {
    let currentMap = this.root;
    // Traverse through the nested maps based on each tuple element.
    for (let i = 0; i < key.length; i++) {
      if (!currentMap.has(key[i])) return false;
      currentMap = currentMap.get(key[i]);
    }
    // Check if the tuple's presence marker is found at the final position.
    return currentMap.has(TupleSet.PRESENCE_MARKER);
  }

  /**
   * Deletes the tuple from the set.
   * @param key - The tuple to delete.
   * @returns True if the tuple was successfully deleted, otherwise false.
   */
  delete(key: K) {
    let currentMap = this.root;
    const mapsStack: [Map<any, any>, any][] = [];

    // Traverse through the maps, keeping a stack to clean up empty maps later.
    for (let i = 0; i < key.length; i++) {
      if (!currentMap.has(key[i])) return false;
      mapsStack.push([currentMap, key[i]]);
      currentMap = currentMap.get(key[i]);
    }

    const deletionResult = currentMap.delete(TupleSet.PRESENCE_MARKER);

    // Clean up any empty maps from the bottom up.
    for (let i = mapsStack.length - 1; i >= 0; i--) {
      const [map, part] = mapsStack[i];
      const nestedMap = map.get(part);
      if (nestedMap.size === 0) {
        map.delete(part);
      } else {
        break;
      }
    }

    return deletionResult;
  }

  /**
   * Clears all entries in the set.
   */
  clear() {
    this.root.clear();
  }

  /**
   * Iterates over all tuples in the set.
   * @returns An iterable of all tuples in the set.
   */
  *values(): Generator<K, void, undefined> {
    function* iterate(map: Map<any, any>, path: any[]): IterableIterator<any[]> {
      for (const [key, value] of map.entries()) {
        if (key === TupleSet.PRESENCE_MARKER) {
          yield path.slice();
        } else {
          yield* iterate(value, [...path, key]);
        }
      }
    }
    yield* iterate(this.root, []) as Iterable<K>;
  }

  /** @inheritdoc */
  [Symbol.iterator]() {
    return this.values();
  }

  /**
   * Static marker used to denote the presence of a tuple in the set.
   */
  private static PRESENCE_MARKER = Symbol('TupleSetPresenceMarker');
}
