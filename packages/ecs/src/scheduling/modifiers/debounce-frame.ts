import type { SchedulerCtor } from '../scheduler-constructor';
import { Scheduler } from '../scheduler';
import type { SchedulerDescriptor } from '../scheduler-descriptor';

export function debounceFrame<T>(schedulersConstructor: SchedulerCtor<T>): SchedulerCtor<T> {
  return class extends Scheduler<T> {
    #frameRequestId: number | null = null;
    #lastPayload: T | undefined = undefined;
    #isDisposed = false;

    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this);

    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'debounce-frame', children: [this.#scheduler.describe()] };
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
