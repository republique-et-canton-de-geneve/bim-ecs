import { Scheduler } from '../scheduling';
import type { SystemSpecification } from './system-specification';
import type { EcsWorld } from '../world';
import { SCHEDULER_DISPOSED_EVENT } from '../scheduling/scheduler-events';
import {
  ECS_SYSTEM_DISPOSED_EVENT,
  ECS_SYSTEM_PROCESSED_EVENT,
  ECS_SYSTEM_PROCESSING_EVENT,
  ECS_SYSTEM_PROCESSING_FAILED_EVENT,
} from './system-events';
import type { EcsEvent } from '../event-bus';
import { createMixinRunner } from './system-mixin-runner';
import type { SchedulerCtor, SchedulerCtorSystemHost } from '../scheduling/scheduler-constructor';
import type { ExtractEcsEventType } from '../event-bus/extract-ecs-event-type';
import { DEBUG_DEPENDENCIES, DEBUG_DEPENDENTS, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import type { EcsCommand } from './commands';

export class SystemRunner<TPayload, TReturnType = any> implements Disposable, Debuggable {
  #running = false;
  #disposed = false;
  #schedulerDisposed = false;

  readonly #scheduler: Scheduler<TPayload>;
  // #iterator: any; //AsyncIterator<TPayload>

  // Scheduler disposal handling
  readonly #unsubscribeSchedulerDisposedEvent: () => void;

  /** @inheritDoc */
  get [DEBUG_NAME]() {
    return this.name;
  }

  /** @inheritDoc */
  get [DEBUG_ID]() {
    return `system__${this.id}`;
  }

  /** @inheritDoc */
  readonly [DEBUG_TYPE] = '🚀';

  /** @inheritDoc */
  get [DEBUG_DEPENDENCIES]() {
    return [this.#scheduler];
  }

  /** @inheritDoc */
  get [DEBUG_DEPENDENTS]() {
    const result: Debuggable[] = [];
    if (this.options?.then?.publish) {
      const event = this.options.then.publish;
      result.push({
        [DEBUG_NAME]: event.description!,
        [DEBUG_DEPENDENCIES]: [],
        [DEBUG_ID]: `on_${event.description}`,
        [DEBUG_TYPE]: '⚡',
      });
    }

    if (this.options?.then?.trigger) {
      const command = this.options.then.trigger;
      result.push({
        [DEBUG_NAME]: command.description!,
        [DEBUG_DEPENDENCIES]: [],
        [DEBUG_ID]: `onCommand_${command.description}`,
        [DEBUG_TYPE]: '🕹',
      });

      return result;
    }

    // return [
    //   ...this.options?.then?.publish?.map((e: EcsEvent) => ({
    //     [DEBUG_NAME]: (e as Symbol).description
    //   })) ?? []
    // ]
  }

  /** User-friendly label */
  get label() {
    return this.name;
  }
  /** Disposed status */
  get disposed() {
    return this.#disposed;
  }
  /** Running status */
  get running() {
    return this.#running;
  }

  constructor(
    public readonly name: string,
    public readonly id: number,
    public readonly ecs: {
      readonly system: SystemSpecification<TPayload, TReturnType>;
      readonly scheduler: SchedulerCtor<TPayload>;
      readonly world: EcsWorld;
    },
    public readonly options?: {
      maxLogLevel?: 'info' | 'debug';
      then?: {
        publish?: EcsEvent<TReturnType>;
        trigger?: EcsCommand<TReturnType>;
      };
    },
  ) {
    this.#scheduler = new this.ecs.scheduler(ecs.world, { systemId: this.id });
    // this.#iterator = this.#schedulerIterable[Symbol.asyncIterator]()

    this.#unsubscribeSchedulerDisposedEvent = ecs.world.bus.subscribe(SCHEDULER_DISPOSED_EVENT, ({ host }) => {
      if ((host as SchedulerCtorSystemHost).systemId === this.id) {
        if (!this.#running) this[Symbol.dispose]();
        this.#schedulerDisposed = true;
      }
    });
  }

  /** Interrupts the running system */
  public async stop() {
    // Disposed state check
    if (this.#disposed) return;
    this.#running = false;
  }

  /** Runs the system through scheduler instance */
  public run() {
    // Disposed state check
    if (this.#disposed) {
      throw new Error('Cannot run a disposed system');
    }

    // Running state check
    if (this.#running) return;
    this.#running = true;

    const nextHandler = (payload: any) => {
      if (this.disposed) return;

      // Beginning event
      this.publishStateEvent(ECS_SYSTEM_PROCESSING_EVENT);

      try {
        // System processing
        const result = this.ecs.system(this.ecs.world, {
          payload,
          mixin: createMixinRunner(this.ecs.world, this.id), // TODO lazy loading
        });

        const processAfterward = (result: any) => {
          // End event
          this.publishStateEvent(ECS_SYSTEM_PROCESSED_EVENT, {
            returnValue: result,
          } satisfies Pick<ExtractEcsEventType<typeof ECS_SYSTEM_PROCESSED_EVENT>, 'returnValue'>);

          // Post execution event processing
          if (this.options?.then?.publish) {
            this.ecs.world.bus.publish(this.options.then.publish, result);
          }

          // Post execution command processing
          if (this.options?.then?.trigger) {
            this.ecs.world.systems.triggerCommand(this.options.then.trigger, result);
          }
        };

        if (typeof (result as Promise<unknown>)?.then === 'function') {
          // Promise case
          (result as Promise<any>).then(processAfterward);
        } else {
          // Synchronous case
          processAfterward(result);
        }

        return result;
      } catch (error) {
        // Error event
        this.publishStateEvent(ECS_SYSTEM_PROCESSING_FAILED_EVENT, { error } satisfies Pick<
          ExtractEcsEventType<typeof ECS_SYSTEM_PROCESSING_FAILED_EVENT>,
          'error'
        >);
        console.error(`[ECS] An error occurred while running system ${this.ecs.system.name}`, error);
      } finally {
        if (this.#schedulerDisposed) this[Symbol.dispose]();
      }
    };

    const disposeHandler = () => {
      this[Symbol.dispose]();
    };

    this.#scheduler.run(nextHandler, disposeHandler);
  }
  /** Publishes a system event to current world event bus */
  private publishStateEvent(key: EcsEvent<{ id: number; time: number }>, additionalData?: any) {
    const time = Date.now();
    this.ecs.world.bus.publish(key, additionalData ? { id: this.id, time, ...additionalData } : { id: this.id, time });
  }

  [Symbol.dispose]() {
    if (!this.#disposed) {
      this.#unsubscribeSchedulerDisposedEvent();

      this.#disposed = true;
      this.#running = false;

      this.#scheduler[Symbol.dispose]();
      this.publishStateEvent(ECS_SYSTEM_DISPOSED_EVENT);
    }
  }
}
