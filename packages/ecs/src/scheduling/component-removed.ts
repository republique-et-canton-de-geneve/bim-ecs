import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { EcsComponent, type EcsComponentCtor } from '../components';
import { ECS_COMPONENT_LINK_REMOVED } from '../components/ecs-component-events';
import type { EntityId } from '../entities';
import type { QueryDefinition } from '../querying/query-definition';
import { runAtomicQueryOnSingleEntity } from '../querying/query-processing';
import { archetypeMaskFor } from '../querying/_archetype/archetype-mask-for';
import { compileQueryDefinition } from '../querying/compile-query';

/**
 * Schedules execution on ECS component removed
 * @param componentType The component type
 * @param query Allowed entities
 */
export function componentRemoved<TValue, TComponent extends EcsComponent<TValue>>(
  componentType: EcsComponentCtor<TComponent, TValue>,
  query?: QueryDefinition,
): SchedulerCtor<{ component: TComponent; entity: EntityId }> {
  return class extends Scheduler<{ component: TComponent; entity: EntityId }> implements Debuggable {
    #resolveNext: ((value: { component: TComponent; entity: EntityId }) => void) | null = null;

    /** Pending event payloads */
    readonly #eventPayloadsQueue: { component: TComponent; entity: EntityId }[] = [];

    #unsubscribe: Function = this.world.bus.subscribe(ECS_COMPONENT_LINK_REMOVED, (args) => {
      if (
        // Component type check
        args.component.constructor !== componentType ||
        // (Optionally) Query check
        (query &&
          !runAtomicQueryOnSingleEntity(
            {
              entity: args.entity,
              componentsMask: archetypeMaskFor(
                this.world.entities.componentsOf(args.entity).keys(),
                this.world.query.archetypeCache.counter,
              ),
            },
            compileQueryDefinition(query),
            {
              counter: this.world.query.archetypeCache.counter,
              indexesRepository: this.world.query.indexedComponentsCache.entitiesByComponentValues,
            },
          ))
      ) {
        return; // Not candidate
      }

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
    readonly [DEBUG_TYPE] = '♟-';
    get [DEBUG_ID]() {
      return `onComponentRemoved_${componentType.name}`;
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
