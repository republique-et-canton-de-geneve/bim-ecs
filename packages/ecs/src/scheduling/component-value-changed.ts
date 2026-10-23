import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import type { SchedulerDescriptor } from './scheduler-descriptor';
import { type EcsComponentCtor, EcsMutableComponent } from '../components';
import { ECS_MUTABLE_COMPONENT_VALUE_CHANGED } from '../components/ecs-component-events';
import type { EntityId } from '../entities';
import type { QueryDefinition } from '../querying/query-definition';
import { runAtomicQueryOnSingleEntity } from '../querying/query-processing';
import { archetypeMaskFor } from '../querying/_archetype/archetype-mask-for';
import { compileQueryDefinition } from '../querying/compile-query';

/**
 * Schedules execution on ECS mutable component value changed
 * @param componentType The tracked mutable component type
 * @param query Allowed entities (optional)
 */
export function componentValueChanged<TValue, TComponent extends EcsMutableComponent<TValue>>(
  componentType: EcsComponentCtor<TComponent, TValue>,
  query?: QueryDefinition,
): SchedulerCtor<{ component: TComponent; entities: Iterable<EntityId>; oldValue: TValue; newValue: TValue }> {
  return class extends Scheduler<{
    component: TComponent;
    entities: Iterable<EntityId>;
    oldValue: TValue;
    newValue: TValue;
  }> {
    /** The compiled query (compiled once, reused on every event) */
    readonly #queryClr = query ? compileQueryDefinition(query) : undefined;

    #resolveNext:
      | ((value: { component: TComponent; entities: Iterable<EntityId>; oldValue: TValue; newValue: TValue }) => void)
      | null = null;

    /** Pending event payloads */
    readonly #eventPayloadsQueue: {
      component: TComponent;
      entities: Iterable<EntityId>;
      oldValue: TValue;
      newValue: TValue;
    }[] = [];

    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'component-value-changed', labels: [componentType.name] };
    }

    /** @inheritdoc */
    public run(
      next: (payload: {
        component: TComponent;
        entities: Iterable<EntityId>;
        oldValue: TValue;
        newValue: TValue;
      }) => void,
    ) {
      this.#unsubscribe = this.world.bus.subscribe(ECS_MUTABLE_COMPONENT_VALUE_CHANGED, (args) => {
        // Filtering
        if (
          // Component type check
          args.component.constructor !== componentType ||
          // (Optionally) Query check
          (this.#queryClr &&
            [...args.entities].every(
              (entity) =>
                !runAtomicQueryOnSingleEntity(
                  {
                    entity,
                    // The archetype cache is up to date here (subscribed at world construction, before any scheduler)
                    componentsMask:
                      this.world.entities.querying.archetypeCache.archetypeMaskByEntity.get(entity) ??
                      archetypeMaskFor(
                        this.world.entities.componentsOf(entity).keys(),
                        this.world.entities.querying.archetypeCache.counter,
                      ),
                  },
                  this.#queryClr!,
                  {
                    counter: this.world.entities.querying.archetypeCache.counter,
                    indexesRepository: this.world.entities.querying.indexedComponentsCache.entitiesByComponentValues,
                  },
                ),
            ))
        ) {
          return; // Not candidate
        }

        // Next step processing
        next(args as { component: TComponent; entities: Iterable<EntityId>; oldValue: TValue; newValue: TValue });
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
