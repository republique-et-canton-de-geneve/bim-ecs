import type { SchedulerCtor } from '../scheduler-constructor';
import { Scheduler } from '../scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE } from '../../debug';

let i = 0;

/**
 * Debounce scheduler items
 * @param schedulersConstructor The scheduler to be transformed
 * @param delay The debounce delay in ms
 */
export function debounce<T>(schedulersConstructor: SchedulerCtor<T>, delay: number): SchedulerCtor<T> {
  return class extends Scheduler<T> {
    #_internalId = i++;
    #debounceTimer: NodeJS.Timeout | null = null;
    #lastPayload: T | undefined = undefined;

    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this);

    get [DEBUG_NAME]() {
      return `debounce ${delay}ms`;
    }
    readonly [DEBUG_TYPE] = '🎚';
    get [DEBUG_ID]() {
      return `debounce_${delay}_${this.#_internalId}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [this.#scheduler];
    }

    /** @inheritdoc */
    public run(next: (payload: T) => void, dispose: () => void): void {
      let markedAsDisposed = false;

      const tryDispose = () => {
        if (markedAsDisposed && !this.#debounceTimer) {
          dispose();
        }
      };

      const handleChildDispose = () => {
        markedAsDisposed = true;
        tryDispose();
      };

      const handleChildNext = (payload: T) => {
        if (this.disposed) return;

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
      // Updates the dispose state
      super[Symbol.dispose]();

      // Unlock the last deferred element (if any) to terminate process without leak
      if (this.#debounceTimer !== null) {
        clearTimeout(this.#debounceTimer);
        this.#debounceTimer = null;
      }
    }
  };
}
