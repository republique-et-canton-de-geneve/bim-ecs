import type { SchedulerCtor } from '../scheduler-constructor'
import { Scheduler } from '../scheduler'
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE } from '../../debug'

let i = 0

/**
 * Debounce scheduler items
 * @param schedulersConstructor The scheduler to be transformed
 * @param delay The debounce delay in ms
 */
export function debounce<T>(
  schedulersConstructor: SchedulerCtor<T>,
  delay: number,
): SchedulerCtor<T> {
  return class extends Scheduler<T> {
    #_internalId = i++

    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this)
    #resolveFn: Function | null = null

    get [DEBUG_NAME]() {
      return `debounce ${delay}ms`
    }
    readonly [DEBUG_TYPE] = '🎚'
    get [DEBUG_ID]() {
      return `debounce_${delay}_${this.#_internalId}`
    }
    get [DEBUG_DEPENDENCIES]() {
      return [this.#scheduler]
    }

    /** @inheritdoc */
    async *getIteratorImplementation() {
      let rejectFn: Function | null = null
      let done = false

      /** Creates a new deferral value */
      const createDeferral = () =>
        new Promise<T>((resolve, reject) => {
          this.#resolveFn = resolve
          rejectFn = reject
        })

      /** Deferred iteration item */
      let deferredResult = createDeferral()

      /** TimeoutId to be reset if an iteration occurres before specified delay */
      let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined

      /** Loops onto every entry stream items */
      const loop = async () => {
        for await (const item of this.#scheduler) {
          // Disposal management
          if (this.disposed) return

          // Debounced resolution
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => this.#resolveFn!(item), delay)
        }
      }

      // Background looping task
      loop()
        .catch(rejectFn)
        .then(() => (done = true))

      // Streamed data iteration
      while (!done && !this.disposed) {
        const result = await deferredResult
        if (!this.disposed) yield result
        deferredResult = createDeferral()
      }
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      // Updates the dispose state
      super[Symbol.dispose]()

      // Unlock the last deferred element (won't pop because of the disposed state) to terminate process without leak
      this.#resolveFn?.()
    }
  }
}
