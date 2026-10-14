import { Scheduler } from './scheduler';
import type { SchedulerDescriptor } from './scheduler-descriptor';

/** Constructs a Scheduler with the same signature as Scheduler itself */
export type SchedulerConstructor<T> = new (...args: ConstructorParameters<typeof Scheduler<T>>) => Scheduler<T>;

/**
 *  Schedules execution each specified interval
 * @param delay The delay between intervals
 */
export const timer = (delay: number): SchedulerConstructor<number> =>
  class extends Scheduler<number> {
    #timeoutId: number | undefined;

    /** @inheritdoc */
    describe(): SchedulerDescriptor {
      return { kind: 'timer', params: { delay } };
    }

    /** @inheritdoc */
    run(next: (payload: number) => void) {
      this.#timeoutId = setTimeout(next, delay);
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      if (this.#timeoutId !== undefined) {
        clearTimeout(this.#timeoutId);
        this.#timeoutId = undefined;
      }

      super[Symbol.dispose]();
    }
  };
