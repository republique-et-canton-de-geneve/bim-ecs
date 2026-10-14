import type { SchedulerCtor } from '../scheduler-constructor';
import { Scheduler } from '../scheduler';
import { EcsWorld } from '../../world';
import type { SchedulerDescriptor } from '../scheduler-descriptor';

/**
 * Conditional scheduler modifier
 * @param predicateFactory The predicate
 * @param schedulersConstructor The scheduler to be transformed
 */
export function when<T>(
  predicateFactory: (world: EcsWorld) => (data: { payload: T }) => boolean,
  schedulersConstructor: SchedulerCtor<T>,
): SchedulerCtor<T> {
  return class WhenScheduler extends Scheduler<T> {
    readonly #scheduler: Scheduler<T> = new schedulersConstructor(this.world, this);

    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return {
        kind: 'when',
        params: { predicate: predicateFactory.name || '#anonymous condition' },
        children: [this.#scheduler.describe()],
      };
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
