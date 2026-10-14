import type { SchedulerCtor } from '../scheduler-constructor';
import { Scheduler } from '../scheduler';
import type { SchedulerDescriptor } from '../scheduler-descriptor';

/**
 * Debounce scheduler items
 * @param schedulersConstructor The scheduler to be transformed
 * @param delay The debounce delay in ms
 */
export function debounce<T>(schedulersConstructor: SchedulerCtor<T>, delay: number): SchedulerCtor<T> {
  return class extends Scheduler<T> {
    #debounceTimer: ReturnType<typeof setTimeout> | null = null;
    #lastPayload: T | undefined = undefined;
    #isDisposed = false;

    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this);

    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'debounce', params: { delay }, children: [this.#scheduler.describe()] };
    }

    /** @inheritdoc */
    public run(next: (payload: T) => void, dispose: () => void): void {
      let isChildDisposed = false;

      const tryDispose = () => {
        if (isChildDisposed && !this.#debounceTimer) {
          dispose();
        }
      };

      const handleChildDispose = () => {
        isChildDisposed = true;
        tryDispose();
      };

      const handleChildNext = (payload: T) => {
        if (this.#isDisposed) return;

        this.#lastPayload = payload;

        if (this.#debounceTimer) {
          clearTimeout(this.#debounceTimer);
        }

        this.#debounceTimer = setTimeout(() => {
          if (this.#debounceTimer !== null) {
            next(this.#lastPayload as T);
            this.#debounceTimer = null;
            tryDispose();
          }
        }, delay);
      };

      this.#scheduler.run(handleChildNext, handleChildDispose);
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      if (this.#isDisposed) return;
      this.#isDisposed = true;

      super[Symbol.dispose]();

      if (this.#debounceTimer) {
        clearTimeout(this.#debounceTimer);
        this.#debounceTimer = null;
      }

      this.#scheduler[Symbol.dispose]();
    }
  };
}
