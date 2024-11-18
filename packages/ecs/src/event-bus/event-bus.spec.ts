import { describe, it, expect, vi } from 'vitest'
import { EventBus } from './event-bus'
import { EcsEvent } from './ecs-event'

describe('EventBus', () => {
  it('should subscribe and publish events', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const handlerA = vi.fn(() => {})

    eventBus.subscribe(eventA, handlerA)
    eventBus.publish(eventA, 'Hello, Event A!')

    expect(handlerA).toHaveBeenCalledWith('Hello, Event A!')
    expect(handlerA).toHaveBeenCalledTimes(1)
  })

  it('should allow unsubscribing from events', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const handlerA = vi.fn(() => {})

    const dispose = eventBus.subscribe(eventA, handlerA)
    dispose()
    eventBus.publish(eventA, 'Hello, Event A!')

    expect(handlerA).not.toHaveBeenCalled()
  })

  it('should handle multiple subscriptions to the same event', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const handlerA1 = vi.fn(() => {})
    const handlerA2 = vi.fn(() => {})

    eventBus.subscribe(eventA, handlerA1)
    eventBus.subscribe(eventA, handlerA2)
    eventBus.publish(eventA, 'Hello, Event A!')

    expect(handlerA1).toHaveBeenCalledWith('Hello, Event A!')
    expect(handlerA2).toHaveBeenCalledWith('Hello, Event A!')
    expect(handlerA1).toHaveBeenCalledTimes(1)
    expect(handlerA2).toHaveBeenCalledTimes(1)
  })

  it('should remove the handler after unsubscribing and keep others intact', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const handlerA1 = vi.fn(() => {})
    const handlerA2 = vi.fn(() => {})

    const dispose = eventBus.subscribe(eventA, handlerA1)
    eventBus.subscribe(eventA, handlerA2)

    dispose()
    eventBus.publish(eventA, 'Hello, Event A!')

    expect(handlerA1).not.toHaveBeenCalled()
    expect(handlerA2).toHaveBeenCalledWith('Hello, Event A!')
    expect(handlerA2).toHaveBeenCalledTimes(1)
  })

  // New tests for subscribing to multiple events
  it('should subscribe to multiple events and handle each event correctly', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const eventB: EcsEvent<number> = Symbol('eventB') as EcsEvent<never>
    const handler = vi.fn(() => {})

    eventBus.subscribe([eventA, eventB], handler)
    eventBus.publish(eventA, 'Hello, Event A!')
    eventBus.publish(eventB, 42)

    expect(handler).toHaveBeenCalledWith('Hello, Event A!')
    expect(handler).toHaveBeenCalledWith(42)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('should unsubscribe from multiple events', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const eventB: EcsEvent<number> = Symbol('eventB') as EcsEvent<never>
    const handler = vi.fn(() => {})

    const dispose = eventBus.subscribe([eventA, eventB], handler)
    dispose()

    eventBus.publish(eventA, 'Hello, Event A!')
    eventBus.publish(eventB, 42)

    expect(handler).not.toHaveBeenCalled()
  })

  it('should allow unsubscribing from one event and keep the other intact when subscribing to multiple events', () => {
    const eventBus = new EventBus()

    const eventA: EcsEvent<string> = Symbol('eventA') as EcsEvent<never>
    const eventB: EcsEvent<number> = Symbol('eventB') as EcsEvent<never>
    const handlerA = vi.fn(() => {})
    const handlerB = vi.fn(() => {})

    const disposeA = eventBus.subscribe(eventA, handlerA)
    eventBus.subscribe(eventB, handlerB)

    disposeA() // Unsubscribe from eventA

    eventBus.publish(eventA, 'Hello, Event A!')
    eventBus.publish(eventB, 42)

    expect(handlerA).not.toHaveBeenCalled()
    expect(handlerB).toHaveBeenCalledWith(42)
    expect(handlerB).toHaveBeenCalledTimes(1)
  })
})
