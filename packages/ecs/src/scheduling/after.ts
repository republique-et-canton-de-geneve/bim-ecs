import { Scheduler } from './scheduler';
import {
  ECS_SYSTEM_DISPOSED_EVENT,
  ECS_SYSTEM_PROCESS_ENDED_EVENT,
  ECS_SYSTEM_PROCESSED_EVENT,
  ECS_SYSTEM_PROCESSING_EVENT,
} from '../systems/system-events';
import type { SystemDefinition, SystemDefinitionWithId } from '../systems/system-definition';
import type { SchedulerCtor } from './scheduler-constructor';
import type { ExtractSystemDefinitionPayloadType } from '../systems/extract-system-definition-payload-type';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { SYSTEM_DEFINITION_ID_KEY } from '../systems/define-system';

export function after<TPayload>(systemDefinition: SystemDefinition<any, TPayload>): SchedulerCtor<TPayload>;

export function after<TSystems extends SystemDefinition<any>[]>(
  systemDefinition: TSystems,
  options?: { combination?: 'and' | 'or' },
): SchedulerCtor<ExtractSystemDefinitionPayloadType<TSystems[number]>>;

/**
 * Schedules execution after system execution
 * @param systemDefinition The system definition preceding current system processing
 * @param options Scheduling options
 */
export function after<TPayload>(
  systemDefinition: SystemDefinition<any, TPayload> | SystemDefinition<any, TPayload>[],
  options?: { combination?: 'and' | 'or' },
): SchedulerCtor<TPayload> {
  return class extends Scheduler<TPayload> implements Debuggable {
    #systemDefinitions = Array.isArray(systemDefinition) ? systemDefinition : [systemDefinition];
    #systemDefinitionsStarted = new Set<SystemDefinition<any, any>>();

    #unsubscribeProcessedEvent: Function[] | undefined = undefined;
    #unsubscribeProcessingEvent: Function[] | undefined = undefined;
    #unsubscribeProcessEndedEvent: Function[] | undefined = undefined;
    #unsubscribeDisposedEvent: Function | undefined = undefined;

    /** The correlation ids of the running processes */
    #runningProcessCorrelationIds = new Set<number>();

    /** @inheritdoc */
    public run(next: (payload: TPayload) => void, dispose: () => void): void {
      /** Determines whether the disposal have been triggered by dependencies */
      let markedAsDisposed = false;

      /** Tries disposing: only possible if all dependent processes have ended */
      const tryDispose = () => {
        if (markedAsDisposed && !this.#runningProcessCorrelationIds.size) {
          dispose();
        }
      };

      this.#unsubscribeProcessedEvent = this.#systemDefinitions.map((systemDefinition) =>
        this.world.bus.subscribe(ECS_SYSTEM_PROCESSED_EVENT, ({ id, returnValue }) => {
          // Filtering
          if ((systemDefinition as SystemDefinitionWithId<TPayload>)[SYSTEM_DEFINITION_ID_KEY] === id) {
            this.#systemDefinitionsStarted.add(systemDefinition);

            // And mode expected all dependents systems have run
            if (
              options?.combination === 'and' &&
              this.#systemDefinitionsStarted.size !== this.#systemDefinitions.length
            )
              return;

            // Running dependant systems
            this.#systemDefinitionsStarted.clear();
            next(returnValue);
          }
        }),
      );

      this.#unsubscribeProcessingEvent = this.#systemDefinitions.map((systemDefinition) =>
        this.world.bus.subscribe(ECS_SYSTEM_PROCESSING_EVENT, ({ correlationId, id }) => {
          if ((systemDefinition as SystemDefinitionWithId<TPayload>)[SYSTEM_DEFINITION_ID_KEY] === id) {
            this.#runningProcessCorrelationIds.add(correlationId);
          }
        }),
      );

      this.#unsubscribeProcessEndedEvent = this.#systemDefinitions.map((systemDefinition) =>
        this.world.bus.subscribe(ECS_SYSTEM_PROCESS_ENDED_EVENT, ({ correlationId, id }) => {
          if ((systemDefinition as SystemDefinitionWithId<TPayload>)[SYSTEM_DEFINITION_ID_KEY] === id) {
            this.#runningProcessCorrelationIds.delete(correlationId);
            tryDispose();
          }
        }),
      );

      this.#unsubscribeDisposedEvent = this.world.bus.subscribe(ECS_SYSTEM_DISPOSED_EVENT, ({ id }) => {
        if (id === (systemDefinition as SystemDefinitionWithId<TPayload>)[SYSTEM_DEFINITION_ID_KEY]) {
          markedAsDisposed = true;
          tryDispose();
        }
      });
    }

    readonly [DEBUG_NAME] = Array.isArray(systemDefinition) ? `after (${options?.combination ?? 'or'})` : 'after';
    readonly [DEBUG_TYPE] = '⏱';
    get [DEBUG_ID]() {
      return `after_${((Array.isArray(systemDefinition) ? systemDefinition : [systemDefinition]) as any[]).map((sysdef) => sysdef[SYSTEM_DEFINITION_ID_KEY]).join('_')}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return (Array.isArray(systemDefinition) ? systemDefinition : [systemDefinition]).map((systemDefinition) =>
        this.world.systems.get((systemDefinition as any)[SYSTEM_DEFINITION_ID_KEY]),
      );
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      if (!this.disposed) {
        this.#unsubscribeProcessedEvent?.forEach((dispose) => dispose());
        this.#unsubscribeProcessedEvent = undefined;

        this.#unsubscribeProcessEndedEvent?.forEach((dispose) => dispose());
        this.#unsubscribeProcessEndedEvent = undefined;

        this.#unsubscribeProcessingEvent?.forEach((dispose) => dispose());
        this.#unsubscribeProcessingEvent = undefined;

        this.#unsubscribeDisposedEvent?.();
        this.#unsubscribeDisposedEvent = undefined;

        super[Symbol.dispose]();
      }
    }
  };
}
