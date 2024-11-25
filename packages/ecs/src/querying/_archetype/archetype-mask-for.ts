import type { Archetype, ArchetypeMask } from './archetype';
import { reduce } from '@bim/iterable';
import { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter';
import { getComponentTypeId } from '../component-type-ids';

/**
 * Creates a 32bits mask for specified archetype
 * @param archetype The archetype to be compiled as a mask
 * @param counter Id factory strategy
 */
export function archetypeMaskFor(archetype: Archetype, counter: ComponentTypeIdFlagCounter) {
  return reduce(
    archetype,
    (result, type) => {
      const componentId = getComponentTypeId(type, counter); // UInt32Array of fixed size

      for (let i = 0; i < counter.size; i++) {
        result[i] |= componentId[i]; // Perform bitwise OR directly
      }

      return result;
    },
    new Uint32Array(counter.size) satisfies ArchetypeMask,
  ); // Initialize with a fixed-size Uint32Array
}
