import { Scheduler } from './scheduler';
import { ECS_SYSTEM_DISPOSED_EVENT, ECS_SYSTEM_PROCESSED_EVENT } from '../systems/system-events';
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

    /** @inheritdoc */
    public run(next: (payload: TPayload) => void, dispose: () => void): void {
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
            // this.#resolveNext(returnValue);
            // this.#resolveNext = null;
          }
        }),
      );

      this.#unsubscribeDisposedEvent = this.world.bus.subscribe(ECS_SYSTEM_DISPOSED_EVENT, ({ id }) => {
        if (id === (systemDefinition as SystemDefinitionWithId<TPayload>)[SYSTEM_DEFINITION_ID_KEY]) {
          dispose();
        }
      });
    }

    // Subscribe to the event
    #unsubscribeProcessedEvent: Function[] | undefined = undefined;

    // Handling predecessor disposal
    #unsubscribeDisposedEvent: Function | undefined = undefined;

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
        this.#unsubscribeDisposedEvent?.();

        this.#unsubscribeProcessedEvent = undefined;
        this.#unsubscribeDisposedEvent = undefined;

        super[Symbol.dispose]();
      }
    }
  };
}
