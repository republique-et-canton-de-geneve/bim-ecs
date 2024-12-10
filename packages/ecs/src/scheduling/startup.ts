import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { ECS_WORLD_RUNNING_EVENT } from '../world/world-events';

/** Schedules execution once at startup (system registration of world startup) */
export class startup extends Scheduler<number> implements Debuggable {
  readonly [DEBUG_NAME] = 'startup';
  readonly [DEBUG_TYPE] = '🔘';
  // readonly [DEBUG_TYPE] = '🚀'
  get [DEBUG_ID]() {
    return `startup`;
  }
  get [DEBUG_DEPENDENCIES]() {
    return [];
  }

  #unsubscribe: Function | undefined = undefined;

  /** @inheritdoc */
  public run(next: (payload: number) => any, dispose: () => void) {
    this.#unsubscribe = this.world.bus.subscribe(ECS_WORLD_RUNNING_EVENT, async () => {
      const result = next(Date.now());

      // Promise case
      if (result instanceof Promise) {
        await result;
      }

      queueMicrotask(() => dispose());
    });
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;

    super[Symbol.dispose]();
  }
}
