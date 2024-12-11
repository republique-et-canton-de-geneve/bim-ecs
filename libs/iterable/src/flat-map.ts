/**
 * Iterable flat projection operation
 * @param iterable The iterable to be projected
 * @param selector The projection operation that returns an iterable
 */
export function* flatMap<T, TResult>(iterable: Iterable<T>, selector: (item: T) => Iterable<TResult>): Generator<TResult> {
  for (const value of iterable) {
    for (const innerValue of selector(value)) {
      yield innerValue;
    }
  }
}
