import type { SchedulerCtor } from '../scheduler-constructor';
import { Scheduler } from '../scheduler';
import { EcsWorld } from '../../world';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../../debug';

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
    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this);

    get [DEBUG_NAME]() {
      return `when "${predicateFactory.name ?? '#unknown condition'}"`;
    }
    readonly [DEBUG_TYPE] = '❔';
    get [DEBUG_ID]() {
      return `when_${predicateFactory.name ?? new Date().getTime()}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [this.#scheduler];
    }

    /** @inheritdoc */
    public run(next: (payload: T) => unknown, dispose: () => void) {
      // noinspection JSPotentiallyInvalidUsageOfThis
      const predicate = predicateFactory(this.world);

      const handleChildDispose = () => dispose();

      const handleChildNext = (payload: T) => {
        if (this.disposed) return;

        // Conditional execution management
        if (predicate({ payload: payload! })) next(payload);
      };

      this.#scheduler.run(handleChildNext, handleChildDispose);
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#scheduler[Symbol.dispose]();
      super[Symbol.dispose]();
    }
  };
}
