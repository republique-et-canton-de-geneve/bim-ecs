import { describe, it, expect } from 'vitest'
import { hashArchetypeMask } from './hash-archetype-mask'

describe('fnv1aUint32ArrayHash', () => {
  it('should return the same hash for identical arrays', () => {
    const array1 = new Uint32Array([1, 2, 3, 4])
    const array2 = new Uint32Array([1, 2, 3, 4])

    const hash1 = hashArchetypeMask(array1)
    const hash2 = hashArchetypeMask(array2)

    expect(hash1).toBe(hash2)
  })

  it('should return different hashes for different arrays', () => {
    const array1 = new Uint32Array([1, 2, 3, 4])
    const array2 = new Uint32Array([1, 2, 3, 5])

    const hash1 = hashArchetypeMask(array1)
    const hash2 = hashArchetypeMask(array2)

    expect(hash1).not.toBe(hash2)
  })

  it('should return different hashes for different arrays lengths', () => {
    const array1 = new Uint32Array([1, 2, 3, 4])
    const array2 = new Uint32Array([1, 2, 3])

    const hash1 = hashArchetypeMask(array1)
    const hash2 = hashArchetypeMask(array2)

    expect(hash1).not.toBe(hash2)
  })

  it('should handle empty arrays', () => {
    const emptyArray = new Uint32Array([])

    const hash = hashArchetypeMask(emptyArray)

    expect(hash).toBe(0x811c9dc5) // FNV_OFFSET_BASIS
  })
})
