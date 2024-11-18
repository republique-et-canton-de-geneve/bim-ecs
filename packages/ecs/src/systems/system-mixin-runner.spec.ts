import { describe, it, expect } from 'vitest'
import { defineMixin } from './define-mixin'
import { createMixinRunner } from './system-mixin-runner'
import { EcsWorld } from '../world'

describe('system-mixin-runner', () => {
  it('should run the mixin', async () => {
    const mixin = defineMixin<number>('mixin', async (_, { payload }) => {
      return payload * 2
    })

    const result = await createMixinRunner(new EcsWorld(), 0)(mixin)(5)

    expect(result).toBe(10)
  })
})
