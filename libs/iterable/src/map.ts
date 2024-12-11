/**
 * Iterable projection operation
 * @param iterable The iterable to be projected
 * @param selector The projection operation
 */
export function* map<T, TResult>(iterable: Iterable<T>, selector: (item: T) => TResult) {
  for (const value of iterable) {
    yield selector(value);
  }
}
