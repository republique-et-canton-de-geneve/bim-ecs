export type ArchetypeMaskHash = number;

/**
 * Creates fast hash for archetype array mask
 * @param mask
 */
export function hashArchetypeMask(mask: Uint32Array): ArchetypeMaskHash {
  const FNV_PRIME = 0x01000193; // 16777619
  let hash = 0x811c9dc5; // 2166136261

  for (let i = 0; i < mask.length; i++) {
    hash ^= mask[i];
    hash = (hash * FNV_PRIME) >>> 0; // >>> 0 ensures a 32-bit unsigned integer
  }

  return hash;
}
