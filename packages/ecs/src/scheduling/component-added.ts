import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { EcsComponent, type EcsComponentCtor } from '../components';
import { ECS_COMPONENT_LINK_ADDED } from '../components/ecs-component-events';
import type { EntityId } from '../entities';
import type { QueryDefinition } from '../querying/query-definition';
import { runAtomicQueryOnSingleEntity } from '../querying/query-processing';
import { archetypeMaskFor } from '../querying/_archetype/archetype-mask-for';
import { compileQueryDefinition } from '../querying/compile-query';

/**
 * Schedules execution on ECS component added
 * @param componentType The component type
 * @param query Allowed entities
 */
export function componentAdded<TValue, TComponent extends EcsComponent<TValue>>(
  componentType: EcsComponentCtor<TComponent, TValue>,
  query?: QueryDefinition,
): SchedulerCtor<{ component: TComponent; entity: EntityId }> {
  return class extends Scheduler<{ component: TComponent; entity: EntityId }> implements Debuggable {
    /** @inheritdoc */
    public run(next: (payload: { component: TComponent; entity: EntityId }) => void, dispose: () => void): void {
      this.#unsubscribe = this.world.bus.subscribe(ECS_COMPONENT_LINK_ADDED, (args) => {
        // Filtering
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

        // Next step processing
        next(args as { component: TComponent; entity: EntityId });
      });
    }

    #unsubscribe: Function | undefined = undefined;

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
    [Symbol.dispose]() {
      this.#unsubscribe?.();
      this.#unsubscribe = undefined;

      super[Symbol.dispose]();
    }
  };
}
