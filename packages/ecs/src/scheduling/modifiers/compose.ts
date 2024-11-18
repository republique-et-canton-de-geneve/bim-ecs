import type { SchedulerCtor, SchedulerCtorHost } from '../scheduler-constructor'
import type { EcsWorld } from '../../world'
import { Scheduler } from '../scheduler'
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../../debug'

let i = 0

/**
 * Creates a scheduler aggregation
 * @param schedulersConstructors Scheduler to aggregate
 */
export function compose(...schedulersConstructors: ReadonlyArray<SchedulerCtor<any>>) {
  const DONE = Symbol('done')

  return class extends Scheduler<any> implements Debuggable {
    #_internalId = i++

    /** scheduler instances */
    #schedulers: Scheduler<any>[] = schedulersConstructors.map((ctor) => new ctor(this.world, this))

    get [DEBUG_NAME]() {
      return `compose`
    }
    readonly [DEBUG_TYPE] = '➕'
    get [DEBUG_ID]() {
      return `compose_${this.#_internalId}`
    }
    get [DEBUG_DEPENDENCIES]() {
      return [...this.#schedulers]
    }

    constructor(world: EcsWorld, host: SchedulerCtorHost) {
      super(world, host)
    }

    /** @inheritdoc */
    async *getIteratorImplementation() {
      /** scheduler iterator instances */
      const iterators = this.#schedulers.map((scheduler) => scheduler.getIteratorImplementation())

      // Function to get the next value from an iterator
      async function getNext(iterator: AsyncIterator<any>): Promise<any | null> {
        const result = await iterator.next()
        return result.done ? DONE : result.value
      }

      // Create initial tasks for the first value of each iterator
      const tasks = iterators.map((it) => getNext(it))

      while (tasks.length > 0) {
        // Wait for the first completed task
        const [result, index] = await Promise.race(
          tasks.map((p, i) => p.then((value) => [value, i] as [any, number])),
        )

        if (result !== DONE) {
          // Schedule the next value from the completed iterator
          tasks[index] = getNext(iterators[index])
          yield result
        } else {
          // Remove completed iterator
          tasks.splice(index, 1)
          iterators.splice(index, 1)
        }
      }
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      for (const scheduler of this.#schedulers) {
        scheduler[Symbol.dispose]()
      }

      super[Symbol.dispose]()
    }
  }
}
