import { describe, it, expect } from 'vitest'
import { Scheduler } from './scheduler'
import { EcsWorld } from '../world'

describe('Scheduler', () => {
  describe('Scheduler for systems', () => {
    // Mock Scheduler
    class mockScheduler extends Scheduler<any> {
      public count = 0
      async *getIteratorImplementation() {
        while (true) {
          yield this.count++
        }
      }
    }

    it('should iterate correctly before being disposed', async () => {
      const world = new EcsWorld()
      const disposableScheduler = new mockScheduler(world, { systemId: 0 })
      const iterator = disposableScheduler[Symbol.asyncIterator]()

      expect((await iterator.next()).value).toBe(0)
      expect((await iterator.next()).value).toBe(1)
    })

    it('should stop iterating after being disposed', async () => {
      const world = new EcsWorld()
      const disposableScheduler = new mockScheduler(world, { systemId: 0 })
      const iterator = disposableScheduler[Symbol.asyncIterator]()

      expect((await iterator.next()).value).toBe(0)

      disposableScheduler[Symbol.dispose]()

      expect((await iterator.next()).done).toBe(true)
    })

    it('should set disposed state correctly', () => {
      const world = new EcsWorld()
      const disposableScheduler = new mockScheduler(world, { systemId: 0 })

      expect(disposableScheduler.disposed).toBe(false)

      disposableScheduler[Symbol.dispose]()

      expect(disposableScheduler.disposed).toBe(true)
    })

    it('should return correctly', async () => {
      const world = new EcsWorld()
      const disposableScheduler = new mockScheduler(world, { systemId: 0 })
      const iterator = disposableScheduler[Symbol.asyncIterator]()

      await iterator.next()
      expect(disposableScheduler.disposed).toBe(false)

      await iterator.return()

      expect(disposableScheduler.disposed).toBe(true)
      expect((await iterator.next()).done).toBe(true)
    })
  })
})
