import type { SchedulerCtor } from '../scheduler-constructor';
import { Scheduler } from '../scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE } from '../../debug';

let i = 0;
export function debounceFrame<T>(schedulersConstructor: SchedulerCtor<T>): SchedulerCtor<T> {
  return class extends Scheduler<T> {
    #_internalId = i++;
    #frameRequestId: number | null = null;
    #lastPayload: T | undefined = undefined;
    #isDisposed = false;

    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this);

    get [DEBUG_NAME]() {
      return `debounceFrame`;
    }
    readonly [DEBUG_TYPE] = '🎥';
    get [DEBUG_ID]() {
      return `debounceFrame_${this.#_internalId}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [this.#scheduler];
    }

    /** @inheritdoc */
    public run(next: (payload: T) => void, dispose: () => void): void {
      let isChildDisposed = false;

      const tryDispose = () => {
        if (isChildDisposed && this.#frameRequestId === null) {
          dispose();
        }
      };

      const handleChildDispose = () => {
        isChildDisposed = true;
        tryDispose();
      };

      const handleChildNext = (payload: T) => {
        if (this.#frameRequestId !== null || this.#isDisposed) return;

        this.#lastPayload = payload;
        this.#frameRequestId = requestAnimationFrame(() => {
          if (this.#frameRequestId !== null) {
            next(this.#lastPayload as T);
            this.#frameRequestId = null;
            tryDispose();
          }
        });
      };

      this.#scheduler.run(handleChildNext, handleChildDispose);
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      if (this.#isDisposed) return;
      this.#isDisposed = true;

      super[Symbol.dispose]();

      if (this.#frameRequestId !== null) {
        cancelAnimationFrame(this.#frameRequestId);
        this.#frameRequestId = null;
      }

      this.#scheduler[Symbol.dispose]();
    }
  };
}
