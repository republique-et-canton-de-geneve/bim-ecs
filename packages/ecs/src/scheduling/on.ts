import { type EcsEvent } from '../event-bus';
import { Scheduler } from './scheduler';
import type { SchedulerCtor } from './scheduler-constructor';
import type { ExtractEcsEventType } from '../event-bus/extract-ecs-event-type';
import { keyName, type SchedulerDescriptor } from './scheduler-descriptor';

export function on<TPayload>(eventKey: EcsEvent<TPayload>): SchedulerCtor<TPayload>;
export function on<TEvent extends EcsEvent<any>[]>(
  eventKey: TEvent,
): SchedulerCtor<ExtractEcsEventType<TEvent[number]>>;

/**
 * Schedules execution on specified event from world event bus
 * @param eventKey The Event on which execution is scheduled
 */
export function on<TPayload>(eventKey: EcsEvent<TPayload> | EcsEvent<any>[]): SchedulerCtor<any> {
  return class extends Scheduler<TPayload> {
    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'on', labels: (Array.isArray(eventKey) ? eventKey : [eventKey]).map(keyName) };
    }

    /** @inheritdoc */
    public run(next: (payload: TPayload) => void, dispose: () => void) {
      this.#unsubscribe = (Array.isArray(eventKey) ? eventKey : [eventKey]).map((eventItem) =>
        this.world.bus.subscribe(eventItem, (payload) => next(payload)),
      );
    }

    #unsubscribe: Function[] | undefined = undefined;

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe?.forEach((unsubscribe) => unsubscribe());
      this.#unsubscribe = undefined;

      super[Symbol.dispose]();
    }
  };
}
