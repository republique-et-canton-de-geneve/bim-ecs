/**
 * Iterable filter
 * @param iterable The iterable to be filtered
 * @param predicate The predicate determining whether item is included in output iterable
 */
export function* filter<T>(iterable: Iterable<T>, predicate: (item: T) => any) {
  for (const value of iterable) {
    if (predicate(value)) yield value;
  }
}
