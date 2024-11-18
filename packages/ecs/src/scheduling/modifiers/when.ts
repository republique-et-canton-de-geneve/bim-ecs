import type { SchedulerCtor } from '../scheduler-constructor'
import { Scheduler } from '../scheduler'
import { EcsWorld } from '../../world'
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../../debug'

/**
 * Conditional scheduler modifier
 * @param predicateFactory The predicate
 * @param schedulersConstructor The scheduler to be transformed
 */
export function when<T>(
  predicateFactory: (world: EcsWorld) => (data: { payload: T }) => boolean,
  schedulersConstructor: SchedulerCtor<T>,
): SchedulerCtor<T> {
  return class WhenScheduler extends Scheduler<T> implements Debuggable {
    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this)

    get [DEBUG_NAME]() {
      return `when "${predicateFactory.name ?? '#unknown condition'}"`
    }
    readonly [DEBUG_TYPE] = '❔'
    get [DEBUG_ID]() {
      return `when_${predicateFactory.name ?? new Date().getTime()}`
    }
    get [DEBUG_DEPENDENCIES]() {
      return [this.#scheduler]
    }

    /** @inheritdoc */
    async *getIteratorImplementation(this: WhenScheduler) {
      const predicate = predicateFactory(this.world)

      for await (const payload of this.#scheduler) {
        // Disposal management
        if (this.disposed) return

        // Conditional execution management
        if (predicate({ payload: payload! })) yield payload!
      }
    }
  }
}
