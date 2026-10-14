import { Scheduler } from './scheduler';
import type { SchedulerDescriptor } from './scheduler-descriptor';
import { ECS_WORLD_RUNNING_EVENT } from '../world/world-events';

/** Schedules execution once at startup (system registration of world startup) */
export class startup extends Scheduler<number> {
  #unsubscribe: Function | undefined = undefined;

  /** @inheritdoc */
  public describe(): SchedulerDescriptor {
    return { kind: 'startup' };
  }

  /** @inheritdoc */
  public run(next: (payload: number) => any, dispose: () => void) {
    this.#unsubscribe = this.world.bus.subscribe(ECS_WORLD_RUNNING_EVENT, async () => {
      const result = next(Date.now());

      // Promise case
      if (result instanceof Promise) {
        await result;
      }

      dispose();
    });
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;

    super[Symbol.dispose]();
  }
}
