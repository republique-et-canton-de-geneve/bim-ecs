import { ArchetypeMask } from './archetype.ts';

/**
 * Is mask1 included in mask2 ?
 * @param mask1 The mask expected to be included
 * @param mask2 The reference mask
 */
export function archetypeMaskIncluded(mask1: ArchetypeMask, mask2: ArchetypeMask) {
  for (let i = 0; i < mask1.length; i++) {
    if ((mask1[i] & mask2[i]) !== mask1[i]) {
      // AND boolean operation should keep mask1 shape
      return false;
    }
  }

  return true;
}

/**
 * Is mask1 out of mask2?
 * @param mask1 The mask expected to be excluded
 * @param mask2 The reference mask
 */
export function archetypeMaskExcluded(mask1: ArchetypeMask, mask2: ArchetypeMask) {
  for (let i = 0; i < mask1.length; i++) {
    if ((mask1[i] & mask2[i]) !== 0) {
      // If any bit in mask1 overlaps with mask2, they are not excluded
      return false;
    }
  }

  return true; // All bits are excluded
}
