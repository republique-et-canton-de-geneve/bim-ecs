import { describe, it, expect, vi } from 'vitest'
import { EcsWorld } from '../world'
import { Scheduler } from '../scheduling'
import { defineSystem } from './define-system'

describe('defineSystem', () => {
  it('should run the system according to the scheduler', async () => {
    const mockSystem = vi.fn()
    const mockScheduler = class extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield Promise.resolve(1)
        yield Promise.resolve(2)
        yield Promise.resolve(3)
      }
    }

    const world = new EcsWorld()

    // Define and run the system
    const fooSystem = defineSystem('foo', mockSystem, mockScheduler)
    await fooSystem(world).run()

    // Verify that the system was called three times
    // expect(mockSystem).toHaveBeenCalled()
    // const systemFunction = mockSystem.mock.results[0].value
    expect(mockSystem).toHaveBeenCalledTimes(3)
  })

  it('should pass the ECS world to the system function', async () => {
    const mockSystem = vi.fn()

    const mockScheduler = class extends Scheduler<number> {
      async *getIteratorImplementation() {
        yield Promise.resolve(1)
      }
    }

    const world = new EcsWorld()

    // Define and run the system
    const fooSystem = defineSystem('foo', mockSystem, mockScheduler)
    await fooSystem(world).run()

    expect(mockSystem).toHaveBeenCalledWith(world, expect.anything())
  })
})
