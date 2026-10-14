import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import type { SchedulerDescriptor } from './scheduler-descriptor';
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
  return class extends Scheduler<{ component: TComponent; entity: EntityId }> {
    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'component-removed', labels: [componentType.name] };
    }

    /** @inheritdoc */
    public run(next: (payload: { component: TComponent; entity: EntityId }) => void) {
      this.#unsubscribe = this.world.bus.subscribe(ECS_COMPONENT_LINK_REMOVED, (args) => {
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
                  this.world.entities.querying.archetypeCache.counter,
                ),
              },
              compileQueryDefinition(query),
              {
                counter: this.world.entities.querying.archetypeCache.counter,
                indexesRepository: this.world.entities.querying.indexedComponentsCache.entitiesByComponentValues,
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

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe?.();
      this.#unsubscribe = undefined;

      super[Symbol.dispose]();
    }
  };
}
