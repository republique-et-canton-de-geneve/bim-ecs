/**
 * From any iterable (such as a Set, Map, or even a custom iterable object), apply a reduction operation.
 * @param iterable source iterable
 * @param reducer reducer function
 * @param initialValue Initial value
 */
export function reduce<T, U>(
  iterable: Iterable<T>,
  reducer: (accumulator: U, value: T) => U,
  initialValue: U,
): U {
  const iterator = iterable[Symbol.iterator]()
  let accumulator = initialValue
  let current = iterator.next()

  while (!current.done) {
    accumulator = reducer(accumulator, current.value)
    current = iterator.next()
  }

  return accumulator
}
