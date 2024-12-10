import { type EcsEvent } from '../event-bus';
import { Scheduler } from './scheduler';
import type { SchedulerCtor } from './scheduler-constructor';
import type { ExtractEcsEventType } from '../event-bus/extract-ecs-event-type';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';

export function on<TPayload>(eventKey: EcsEvent<TPayload>): SchedulerCtor<TPayload>;
export function on<TEvent extends EcsEvent<any>[]>(
  eventKey: TEvent,
): SchedulerCtor<ExtractEcsEventType<TEvent[number]>>;

/**
 * Schedules execution on specified event from world event bus
 * @param eventKey The Event on which execution is scheduled
 */
export function on<TPayload>(eventKey: EcsEvent<TPayload> | EcsEvent<any>[]): SchedulerCtor<any> {
  return class extends Scheduler<TPayload> implements Debuggable {
    #resolveNext: ((value: TPayload) => void) | null = null;

    /** Pending event payloads */
    readonly #eventPayloadsQueue: TPayload[] = [];

    /** @inheritdoc */
    public run(next: (payload: TPayload) => void, dispose: () => void) {
      this.#unsubscribe = (Array.isArray(eventKey) ? eventKey : [eventKey]).map((eventItem) =>
        this.world.bus.subscribe(eventItem, (payload) => next(payload)),
      );
    }

    #unsubscribe: Function[] | undefined = undefined;

    get [DEBUG_NAME]() {
      return Array.isArray(eventKey)
        ? eventKey.map((e) => (e as Symbol).description ?? '#no name')
        : ((eventKey as Symbol).description ?? '#no name');
    }
    readonly [DEBUG_TYPE] = '⚡';
    get [DEBUG_ID]() {
      return Array.isArray(eventKey)
        ? eventKey.map((e) => `on_${(e as Symbol).description}`)
        : `on_${(eventKey as Symbol).description}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [];
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe?.forEach((unsubscribe) => unsubscribe());
      this.#unsubscribe = undefined;

      super[Symbol.dispose]();
    }
  };
}
