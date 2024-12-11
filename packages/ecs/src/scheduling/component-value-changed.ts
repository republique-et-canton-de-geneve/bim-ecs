import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
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
  return class
    extends Scheduler<{ component: TComponent; entities: Iterable<EntityId>; oldValue: TValue; newValue: TValue }>
    implements Debuggable
  {
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
          (query &&
            [...args.entities].every(
              (entity) =>
                !runAtomicQueryOnSingleEntity(
                  {
                    entity,
                    componentsMask: archetypeMaskFor(
                      this.world.entities.componentsOf(entity).keys(),
                      this.world.query.archetypeCache.counter,
                    ),
                  },
                  compileQueryDefinition(query),
                  {
                    counter: this.world.query.archetypeCache.counter,
                    indexesRepository: this.world.query.indexedComponentsCache.entitiesByComponentValues,
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
