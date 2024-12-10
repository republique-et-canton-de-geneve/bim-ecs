import type { EcsWorld } from '../world';
import { SCHEDULER_DISPOSED_EVENT } from './scheduler-events';
import type { SchedulerCtorHost } from './scheduler-constructor';

/** Base class for scheduler */
export abstract class Scheduler<TPayload> implements Disposable {
  #disposed = false;

  /** Determines whether the scheduler is disposed */
  public get disposed() {
    return this.#disposed;
  }

  /**
   * Creates a new scheduler instance
   * @param world The world the scheduler is attached to
   * @param host The host associated to current scheduler instance
   */
  constructor(
    public readonly world: EcsWorld,
    public readonly host: SchedulerCtorHost,
  ) {}

  /** @inheritdoc */
  [Symbol.dispose]() {
    if (this.#disposed) return;
    this.#disposed = true;

    // Event publication
    this.world.bus.publish(SCHEDULER_DISPOSED_EVENT, { host: this.host, time: Date.now() });
  }

  /**
   * Starts scheduling
   * @param next Next step trigger
   * @param dispose Dispose trigger
   */
  public abstract run(next: (payload: TPayload) => unknown, dispose: () => void): void;
}
