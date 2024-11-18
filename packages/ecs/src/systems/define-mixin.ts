import type { SystemSpecification } from './system-specification'

/**
 * Creates a system mixin
 * @param name
 * @param mixin
 */
export function defineMixin<TPayload = never, TReturnType = any>(
  name: string,
  mixin: SystemSpecification<TPayload, TReturnType>,
) {
  return {
    name,
    mixin,
  }
}
