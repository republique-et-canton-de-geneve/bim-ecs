// noinspection DuplicatedCode
import { describe, expect, it } from 'vitest'
import { EcsWorld } from '../world'
import { after } from './after'
import { startup } from './startup'
import { defineSystem } from '../systems'

describe('after', () => {
  it('should schedule execution after the system is processed', async () => {
    const world = new EcsWorld()

    let date1 = null as number | null
    let date2 = null as number | null

    const systemDefinition1 = defineSystem(
      'foo1',
      async () => {
        date1 = Date.now()
        await new Promise((resolve) => setTimeout(resolve, 100))
      },
      startup,
    )

    const systemDefinition2 = defineSystem(
      'foo2',
      () => {
        date2 = Date.now()
      },
      after(systemDefinition1),
    )

    world.registerSystem(systemDefinition1).registerSystem(systemDefinition2)

    world.run()

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(date2! - date1!).approximately(100, 20)
  })

  it('should schedule execution after multiple systems are processed', async () => {
    const world = new EcsWorld()

    let processedCount = 0

    const systemDefinition1_1 = defineSystem(
      'foo1_1',
      async () => {
        processedCount++
      },
      startup,
    )

    const systemDefinition1_2 = defineSystem(
      'foo1_2',
      async () => {
        processedCount++
      },
      startup,
    )

    const systemDefinition2 = defineSystem(
      'foo2',
      () => {},
      after([systemDefinition1_1, systemDefinition1_2]),
    )

    world
      .registerSystem(systemDefinition1_1)
      .registerSystem(systemDefinition1_2)
      .registerSystem(systemDefinition2)

    world.run()

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(processedCount).toBe(2)
  })

  it('should get predecessor return value', async () => {
    const world = new EcsWorld()

    const systemDefinition1 = defineSystem('foo1', () => 'bar', startup)

    let payloadValue: any = undefined
    const systemDefinition2 = defineSystem(
      'foo2',
      (_, { payload }) => (payloadValue = payload),
      after(systemDefinition1),
    )

    world.registerSystem(systemDefinition1).registerSystem(systemDefinition2)

    world.run()

    await new Promise((resolve) => setTimeout(resolve, 150))

    expect(payloadValue).toBe('bar')
  })
})
