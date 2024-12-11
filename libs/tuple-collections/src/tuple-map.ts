/**
 * TupleMap is a strongly-typed Map-like data structure where tuples of varying lengths
 * and types can be used as keys. It achieves this by nesting Maps for each element in the tuple.
 *
 * @template K - The tuple type used as the key.
 * @template V - The value type associated with the tuple keys.
 */
export class TupleMap<K extends any[], V> implements Iterable<[K, V]> {
  /** he root map that will contain nested maps for each tuple key. */
  private root = new Map<any, any>();

  /**
   * Constructs a new TupleMap. Optionally, accepts an iterable of key-value pairs.
   * @param entries - An iterable of key-value pairs (tuples and values) to initialize the map with.
   */
  constructor(entries?: Iterable<[K, V]> | TupleMap<K, V>) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  /**
   * Retrieves the value associated with the tuple key.
   * @param key - The tuple key to look up.
   * @returns The value associated with the key, or undefined if the key is not found.
   */
  get(key: K) {
    let currentMap = this.root;
    for (let i = 0; i < key.length; i++) {
      if (!currentMap.has(key[i])) return undefined;
      currentMap = currentMap.get(key[i]);
    }
    return currentMap as unknown as V | undefined;
  }

  /**
   * Checks whether the tuple key exists in the map.
   * @param key - The tuple key to check.
   * @returns True if the key exists, otherwise false.
   */
  has(key: K) {
    let currentMap = this.root;
    for (let i = 0; i < key.length; i++) {
      if (!currentMap.has(key[i])) return false;
      currentMap = currentMap.get(key[i]);
    }
    return true;
  }

  /**
   * Sets a value in the map for a given tuple key.
   * @param key - The tuple key to associate with the value.
   * @param value - The value to be stored.
   * @returns The current instance of TupleMap (to allow for method chaining).
   */
  set(key: K, value: V) {
    let currentMap = this.root;
    // Traverse through the maps and create new maps as needed for each tuple element.
    for (let i = 0; i < key.length - 1; i++) {
      if (!currentMap.has(key[i])) {
        currentMap.set(key[i], new Map());
      }
      currentMap = currentMap.get(key[i]);
    }
    // Store the final value in the last nested map (not a new map).
    currentMap.set(key[key.length - 1], value);
    return this;
  }

  /**
   * Deletes the entry associated with the tuple key.
   * @param key - The tuple key to delete.
   * @returns True if the key was successfully deleted, otherwise false.
   */
  delete(key: K) {
    let currentMap = this.root;
    const mapsStack: [Map<any, any>, any][] = [];

    // Traverse through the maps to reach the final map that holds the value.
    for (let i = 0; i < key.length - 1; i++) {
      if (!currentMap.has(key[i])) return false; // Key doesn't exist, nothing to delete.
      mapsStack.push([currentMap, key[i]]);
      currentMap = currentMap.get(key[i]);
    }

    // Delete the value stored by the last element of the tuple.
    const deletionResult = currentMap.delete(key[key.length - 1]);

    // Clean up any empty maps from the bottom up, just like before.
    for (let i = mapsStack.length - 1; i >= 0; i--) {
      const [map, part] = mapsStack[i];
      const nestedMap = map.get(part);
      if (nestedMap.size === 0) {
        map.delete(part); // Remove empty maps.
      } else {
        break; // Stop if there are still values in the map.
      }
    }

    return deletionResult;
  }

  /**
   * Returns an iterable of all [K, V] entries in the TupleMap.
   * @returns An iterable of tuple key-value pairs.
   */
  *entries(): IterableIterator<[K, V]> {
    /**
     * Recursively traverse the nested maps to yield all keys and values.
     * @param currentMap - The current level of the nested Map.
     * @param keySoFar - The tuple key accumulated so far.
     */
    const traverse = function* (currentMap: Map<any, any>, keySoFar: any[] = []): IterableIterator<[K, V]> {
      for (const [key, value] of currentMap) {
        const newKey = [...keySoFar, key];
        if (value instanceof Map) {
          yield* traverse(value, newKey);
        } else {
          yield [newKey as K, value as V];
        }
      }
    };

    // Start traversing from the root map and yielding entries
    yield* traverse(this.root);
  }

  /**
   * Returns an iterable of all [V] entries in the TupleMap.
   * @returns An iterable of values.
   */
  *values(): IterableIterator<V> {
    /**
     * Recursively traverse the nested maps to yield all keys and values.
     * @param currentMap - The current level of the nested Map.
     * @param keySoFar - The tuple key accumulated so far.
     */
    const traverse = function* (currentMap: Map<any, any>, keySoFar: any[] = []): IterableIterator<V> {
      for (const [key, value] of currentMap) {
        const newKey = [...keySoFar, key];
        if (value instanceof Map) {
          yield* traverse(value, newKey);
        } else {
          yield value as V;
        }
      }
    };

    // Start traversing from the root map and yielding entries
    yield* traverse(this.root);
  }

  /** @inheritdoc */
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
}
