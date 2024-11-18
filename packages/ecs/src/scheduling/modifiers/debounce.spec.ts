import { describe, it, expect } from 'vitest'
import { Scheduler } from '../scheduler'
import { debounce } from './debounce'
import { EcsWorld } from '../../world'

describe('debounce', () => {
  it('should not debounce any item', async () => {
    const world = new EcsWorld()

    class Scheduler1 extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield 2
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield 3
      }
    }

    const debouncedIterator = new (debounce(Scheduler1, 10))(world, { systemId: 0 })[
      Symbol.asyncIterator
    ]()

    expect((await debouncedIterator.next()).value).toBe(1)
    expect((await debouncedIterator.next()).value).toBe(2)
    expect((await debouncedIterator.next()).value).toBe(3)
    expect((await debouncedIterator.next()).done).toBe(true)
  })

  it('should debounce 2 items', async () => {
    const world = new EcsWorld()

    class Scheduler1 extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield 2
        await new Promise((resolve) => setTimeout(resolve, 1))
        yield 3
      }
    }

    const debouncedIterator = new (debounce(Scheduler1, 10))(world, { systemId: 0 })[
      Symbol.asyncIterator
    ]()

    expect((await debouncedIterator.next()).value).toBe(1)
    expect((await debouncedIterator.next()).value).toBe(3)
    expect((await debouncedIterator.next()).done).toBe(true)
  })

  it('should interrupt scheduling after disposal', async () => {
    const world = new EcsWorld()

    class Scheduler1 extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield 2
        await new Promise((resolve) => setTimeout(resolve, 20))
        yield 3
      }
    }

    const scheduler = new (debounce(Scheduler1, 10))(world, { systemId: 0 })
    const debouncedIterator = scheduler[Symbol.asyncIterator]()

    expect((await debouncedIterator.next()).value).toBe(1)
    expect((await debouncedIterator.next()).value).toBe(2)
    scheduler[Symbol.dispose]()
    expect((await debouncedIterator.next()).done).toBe(true)
  })
})
