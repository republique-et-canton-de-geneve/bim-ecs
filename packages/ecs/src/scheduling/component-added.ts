import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import type { SchedulerDescriptor } from './scheduler-descriptor';
import { EcsComponent, type EcsComponentCtor } from '../components';
import { ECS_COMPONENT_LINK_ADDED } from '../components';
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
  return class extends Scheduler<{ component: TComponent; entity: EntityId }> {
    /** The compiled query (compiled once, reused on every event) */
    readonly #queryClr = query ? compileQueryDefinition(query) : undefined;

    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'component-added', labels: [componentType.name] };
    }

    /** @inheritdoc */
    public run(next: (payload: { component: TComponent; entity: EntityId }) => void, dispose: () => void): void {
      this.#unsubscribe = this.world.bus.subscribe(ECS_COMPONENT_LINK_ADDED, (args) => {
        // Filtering
        if (
          // Component type check
          args.component.constructor !== componentType ||
          // (Optionally) Query check
          (this.#queryClr &&
            !runAtomicQueryOnSingleEntity(
              {
                entity: args.entity,
                // The archetype cache is up to date here (subscribed at world construction, before any scheduler)
                componentsMask:
                  this.world.entities.querying.archetypeCache.archetypeMaskByEntity.get(args.entity) ??
                  archetypeMaskFor(
                    this.world.entities.componentsOf(args.entity).keys(),
                    this.world.entities.querying.archetypeCache.counter,
                  ),
              },
              this.#queryClr,
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
