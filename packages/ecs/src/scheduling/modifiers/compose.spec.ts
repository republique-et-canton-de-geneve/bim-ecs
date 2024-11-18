import { describe, expect, it } from 'vitest'
import { EcsWorld } from '../../world'
import { Scheduler } from '../scheduler'
import { compose } from './compose'

describe('Scheduler.compose', () => {
  it('should restore aggregation in proper order', async () => {
    const world = new EcsWorld()

    class Scheduler1 extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield 1
        await new Promise((resolve) => setTimeout(resolve, 40))
        yield 2
        yield 2.5
        await new Promise((resolve) => setTimeout(resolve, 40))
        yield 3
      }
    }

    class Scheduler2 extends Scheduler<number> {
      async *getIteratorImplementation() {
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield 4
        await new Promise((resolve) => setTimeout(resolve, 40))
        yield 5
        await new Promise((resolve) => setTimeout(resolve, 40))
        yield 6
      }
    }

    const iterator = new (compose(Scheduler1, Scheduler2))(world, {
      systemId: 0,
    }).getIteratorImplementation()

    expect((await iterator.next()).value).toBe(1)
    expect((await iterator.next()).value).toBe(4)
    expect((await iterator.next()).value).toBe(2)

    // Forces the composed scheduler to buffer next tick
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect((await iterator.next()).value).toBe(2.5)
    expect((await iterator.next()).value).toBe(5)
    expect((await iterator.next()).value).toBe(3)
    expect((await iterator.next()).value).toBe(6)
    expect((await iterator.next()).done).toBe(true)
  })
})
