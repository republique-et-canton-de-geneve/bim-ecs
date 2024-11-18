import type { EcsWorld } from '../world'
import { SCHEDULER_DISPOSED_EVENT } from './scheduler-events'
import type { SchedulerCtorHost } from './scheduler-constructor'

/** Base class for scheduler */
export abstract class Scheduler<TPayload> implements Disposable {
  #disposed = false

  /** Determines whether the scheduler is disposed */
  public get disposed() {
    return this.#disposed
  }

  /**
   * Creates a new scheduler instance
   * @param world The world the scheduler is attached to
   * @param host The host associated to current scheduler instance
   */
  constructor(
    public readonly world: EcsWorld,
    public readonly host: SchedulerCtorHost,
  ) {}

  /** @inheritdoc */
  [Symbol.dispose]() {
    if (this.#disposed) return
    this.#disposed = true

    // Event publication
    this.world.bus.publish(SCHEDULER_DISPOSED_EVENT, { host: this.host, time: Date.now() })
  }

  /** Provides the raw iterator implementation for system scheduling */
  public abstract getIteratorImplementation(): AsyncIterator<TPayload>

  /** Provides the final weaved iterator for system scheduling */
  public [Symbol.asyncIterator]() {
    const originalIterator = this.getIteratorImplementation()
    return {
      next: async () => {
        if (this.#disposed) {
          return { done: true, value: undefined }
        }
        return originalIterator.next()
      },
      return: async () => {
        this.#disposed = true
        if (typeof originalIterator.return === 'function') {
          return originalIterator.return()
        }
        return { done: true, value: undefined }
      },
      throw: async (error: any) => {
        if (typeof originalIterator.throw === 'function') {
          return originalIterator.throw(error)
        }
        throw error
      },
      [Symbol.asyncIterator]: () => this[Symbol.asyncIterator],
    }
  }
}
