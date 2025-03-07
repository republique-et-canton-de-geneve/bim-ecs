import type { Archetype } from './archetype';
import { archetypeMaskFor } from './archetype-mask-for';
import { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter';

export function areArchetypeMatching(
  archetype1: Archetype,
  archetype2: Archetype,
  counter: ComponentTypeIdFlagCounter,
) {
  const archetypeMask1 = archetypeMaskFor(archetype1, counter);
  const archetypeMask2 = archetypeMaskFor(archetype2, counter);

  for (let i = 0; i < counter.size; i++) {
    if (archetypeMask1[i] !== archetypeMask2[i]) {
      return false; // Arrays are not equal
    }
  }

  return true;
}
