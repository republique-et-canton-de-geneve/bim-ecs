import { describe, it, expect } from 'vitest'
import { EcsEvent } from '../event-bus'
import { on } from './on'
import { EcsWorld } from '../world'

describe('Scheduler', () => {
  it('should produce a sequence of numbers on event trigger', async () => {
    const world = new EcsWorld()
    const triggerEvent = Symbol('triggerEvent') as EcsEvent<void>
    const scheduler = on(triggerEvent)

    const iterator = new scheduler(world, { systemId: 0 })[Symbol.asyncIterator]()

    setTimeout(() => world.bus.publish(triggerEvent, undefined), 100)
    setTimeout(() => world.bus.publish(triggerEvent, undefined), 200)

    expect(await iterator.next()).toEqual({ done: false })
    expect(await iterator.next()).toEqual({ done: false })
  })

  it('should handle no event triggers gracefully', async () => {
    const world = new EcsWorld()
    const triggerEvent = Symbol('triggerEvent') as EcsEvent<void>
    const scheduler = on(triggerEvent)

    const iterator = new scheduler(world, { systemId: 0 })[Symbol.asyncIterator]()

    const result = await Promise.race([
      iterator.next(),
      new Promise<IteratorResult<number>>((resolve) =>
        setTimeout(() => resolve({ value: undefined, done: true }), 500),
      ),
    ])

    expect(result).toEqual({ value: undefined, done: true })
  })

  it('should allow multiple subscribers for the same event', async () => {
    const world = new EcsWorld()
    const triggerEvent = Symbol('triggerEvent') as EcsEvent<number>
    const scheduler1 = on(triggerEvent)
    const scheduler2 = on(triggerEvent)

    const iterator1 = new scheduler1(world, { systemId: 0 })[Symbol.asyncIterator]()
    const iterator2 = new scheduler2(world, { systemId: 0 })[Symbol.asyncIterator]()

    setTimeout(() => world.bus.publish(triggerEvent, 10), 0)

    const [result1, result2] = await Promise.all([iterator1.next(), iterator2.next()])

    expect(result1).toEqual({ done: false, value: 10 })
    expect(result2).toEqual({ done: false, value: 10 })
  })

  it('should allow multiple events subscriptions', async () => {
    const world = new EcsWorld()
    const event1 = Symbol('triggerEvent') as EcsEvent<number>
    const event2 = Symbol('triggerEvent') as EcsEvent<string>

    const scheduler = on([event1, event2])

    const iterator = new scheduler(world, { systemId: 0 })[Symbol.asyncIterator]()

    setTimeout(() => world.bus.publish(event1, 10), 0)
    const result1 = await iterator.next()
    expect(result1).toEqual({ value: 10, done: false })

    setTimeout(() => world.bus.publish(event2, 'foo'), 0)
    const result2 = await iterator.next()
    expect(result2).toEqual({ value: 'foo', done: false })
  })
})
