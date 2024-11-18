// noinspection DuplicatedCode

import { describe, it, expect } from 'vitest'
import { Scheduler } from '../scheduler'
import { EcsWorld } from '../../world'
import { when } from './when'

describe('when', () => {
  it('should not filter any item', async () => {
    const world = new EcsWorld()

    class Scheduler1 extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield 1
        yield 2
        yield 3
      }
    }

    const debouncedIterator = new (when(() => () => true, Scheduler1))(world, { systemId: 0 })[
      Symbol.asyncIterator
    ]()

    expect((await debouncedIterator.next()).value).toBe(1)
    expect((await debouncedIterator.next()).value).toBe(2)
    expect((await debouncedIterator.next()).value).toBe(3)
    expect((await debouncedIterator.next()).done).toBe(true)
  })

  it('should filter last items', async () => {
    const world = new EcsWorld()

    let predicateResult = true

    class Scheduler1 extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield 1
        yield 2
        predicateResult = false
        yield 3
      }
    }

    const debouncedIterator = new (when(() => () => predicateResult, Scheduler1))(world, {
      systemId: 0,
    })[Symbol.asyncIterator]()

    expect((await debouncedIterator.next()).value).toBe(1)
    expect((await debouncedIterator.next()).value).toBe(2)
    expect((await debouncedIterator.next()).done).toBe(true)
  })
})
