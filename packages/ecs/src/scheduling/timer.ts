import { Scheduler } from './scheduler';

/**
 *  Schedules execution each specified interval
 * @param delay The delay between intervals
 */
export const timer = (delay: number) =>
  class extends Scheduler<number> {
    #timeoutId: number | undefined;

    /** @inheritdoc */
    public run(next: (payload: number) => void) {
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
