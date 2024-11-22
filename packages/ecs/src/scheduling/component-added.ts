import { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { EcsComponent, EcsComponentCtor } from '../components';
import { ECS_COMPONENT_LINK_ADDED } from '../components/ecs-component-events';
import { EntityId } from '../entities';

/**
 * Schedules execution on ECS component added
 * @param componentType The component type
 */
export function componentAdded<TValue, TComponent extends EcsComponent<TValue>>(
  componentType: EcsComponentCtor<TComponent, TValue>,
): SchedulerCtor<{ component: TComponent; entity: EntityId }> {
  return class extends Scheduler<{ component: TComponent; entity: EntityId }> implements Debuggable {
    #resolveNext: ((value: { component: TComponent; entity: EntityId }) => void) | null = null;

    /** Pending event payloads */
    readonly #eventPayloadsQueue: { component: TComponent; entity: EntityId }[] = [];

    #unsubscribe: Function = this.world.bus.subscribe(ECS_COMPONENT_LINK_ADDED, (args) => {
      if (args.component.constructor !== componentType) return;
      if (this.#resolveNext) {
        // Executing immediately
        this.#resolveNext(args as { component: TComponent; entity: EntityId });
        this.#resolveNext = null;
      } else {
        // Stacking data
        this.#eventPayloadsQueue.push(args as { component: TComponent; entity: EntityId });
      }
    });

    get [DEBUG_NAME]() {
      return componentType.name ?? '#no name';
    }
    readonly [DEBUG_TYPE] = '♟+';
    get [DEBUG_ID]() {
      return `onComponentAdded_${componentType.name}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [];
    }

    /** @inheritdoc */
    getIteratorImplementation() {
      const setResolver = (resolver: (value: { component: TComponent; entity: EntityId }) => void) => {
        if (this.#eventPayloadsQueue.length) {
          // Available stacked data
          resolver(this.#eventPayloadsQueue.shift()!);
        } else {
          // Nothing stacked. Awaiting next data
          this.#resolveNext = resolver;
        }
      };

      return {
        /** @inheritdoc */
        next() {
          return new Promise<IteratorResult<{ component: TComponent; entity: EntityId }>>((resolve) => {
            /** @inheritdoc */
            setResolver((value) => resolve({ value, done: false }));
          });
        },
      };
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe();
      super[Symbol.dispose]();
    }
  };
}
