import { Scheduler } from '../scheduling';
import type { SystemSpecification } from './system-specification';
import type { EcsWorld } from '../world';
import { SCHEDULER_DISPOSED_EVENT } from '../scheduling/scheduler-events';
import {
  ECS_SYSTEM_DISPOSED_EVENT,
  ECS_SYSTEM_PROCESS_ENDED_EVENT,
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

  /** The correlation ids of the running processes */
  #runningProcessCorrelationIds = new Set<number>();

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

    let correlationIdCounter = 0;

    /**
     * Handles next iteration step invocation
     * @param payload The payload for this step
     */
    const nextHandler = (payload: any) => {
      if (this.disposed) return;

      /** The correlation id of the current process session step */
      const correlationId = correlationIdCounter++;

      // Declaring process step session as running
      this.#runningProcessCorrelationIds.add(correlationId);

      /**
       * Handles process failure
       * @param error The error
       */
      const failureHandler = (error: any) => {
        // Error event
        this.publishStateEvent(ECS_SYSTEM_PROCESSING_FAILED_EVENT, { correlationId, error } satisfies Pick<
          ExtractEcsEventType<typeof ECS_SYSTEM_PROCESSING_FAILED_EVENT>,
          'error' | 'correlationId'
        >);
        console.error(`[ECS] An error occurred while running system ${this.ecs.system.name}`, error);
      };

      /**
       * Handles process ending
       */
      const finalizationHandler = () => {
        // Declaring process step session as ended
        this.#runningProcessCorrelationIds.delete(correlationId);

        // End event
        this.publishStateEvent(ECS_SYSTEM_PROCESS_ENDED_EVENT, { correlationId } satisfies Pick<
          ExtractEcsEventType<typeof ECS_SYSTEM_PROCESS_ENDED_EVENT>,
          'correlationId'
        >);
      };

      // Beginning event
      this.publishStateEvent(ECS_SYSTEM_PROCESSING_EVENT, { correlationId } satisfies Pick<
        ExtractEcsEventType<typeof ECS_SYSTEM_PROCESSING_EVENT>,
        'correlationId'
      >);

      /** Determines whether the process is async */
      let isAsync = false;
      try {
        // System processing
        const result = this.ecs.system(this.ecs.world, {
          payload,
          mixin: createMixinRunner(this.ecs.world, this.id), // TODO lazy loading
        });

        const processAfterward = (result: any) => {
          // End event
          this.publishStateEvent(ECS_SYSTEM_PROCESSED_EVENT, {
            correlationId,
            returnValue: result,
          } satisfies Pick<ExtractEcsEventType<typeof ECS_SYSTEM_PROCESSED_EVENT>, 'returnValue' | 'correlationId'>);

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
          // Promise case -> async path
          (result as Promise<any>).then(processAfterward).catch(failureHandler).finally(finalizationHandler);
        } else {
          // Synchronous case
          isAsync = true;
          processAfterward(result); // -> sync path step1
        }

        return result;
      } catch (error) {
        failureHandler(error);
      } finally {
        if (!isAsync) finalizationHandler(); // -> sync path step2
        if (this.#schedulerDisposed) this[Symbol.dispose]();
      }
    };

    /** Handles disposal request from scheduler */
    const disposeHandler = () => queueMicrotask(() => this[Symbol.dispose]());

    this.#scheduler.run(nextHandler, disposeHandler);
  }

  /**
   * Determines whether the process correlation id is currently running
   * @param correlationId The correlation id of the process step iteration
   */
  public isRunning(correlationId: number) {
    return this.#runningProcessCorrelationIds.has(correlationId);
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
