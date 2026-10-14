import type { SchedulerCtor, SchedulerCtorHost } from '../scheduler-constructor';
import type { EcsWorld } from '../../world';
import { Scheduler } from '../scheduler';
import type { SchedulerDescriptor } from '../scheduler-descriptor';

/**
 * Creates a scheduler aggregation
 * @param schedulersConstructors Scheduler to aggregate
 */
export function compose(...schedulersConstructors: ReadonlyArray<SchedulerCtor<any>>): SchedulerCtor<any> {
  return class extends Scheduler<any> {
    /** scheduler instances */
    #schedulers = schedulersConstructors.map((ctor) => new ctor(this.world, this));
    #disposedSchedulers = new Set<Scheduler<any>>();

    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'compose', children: this.#schedulers.map((scheduler) => scheduler.describe()) };
    }

    constructor(world: EcsWorld, host: SchedulerCtorHost) {
      super(world, host);
    }

    public run(next: (payload: any) => void, dispose: () => void): void {
      const handleChildNext = (payload: any) => {
        if (this.disposed) return;

        next(payload);
      };

      for (const scheduler of this.#schedulers) {
        const handleChildDispose = () => {
          this.#disposedSchedulers.add(scheduler);
          if (this.#disposedSchedulers.size === this.#schedulers.length) dispose();
        };

        scheduler.run(handleChildNext, handleChildDispose);
      }
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      for (const scheduler of this.#schedulers) {
        scheduler[Symbol.dispose]();
      }

      super[Symbol.dispose]();
    }
  };
}
