import { Scheduler } from './scheduler'

/**
 *  Schedules execution each specified interval
 * @param delay The delay between intervals
 */
export const timer = (delay: number) =>
  class extends Scheduler<number> {
    /** @inheritdoc */
    getIteratorImplementation() {
      const iterator: AsyncIterator<number> = {
        next: async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, delay))
          return { value: Date.now(), done: false }
        },
      }
      return iterator
    }
  }
