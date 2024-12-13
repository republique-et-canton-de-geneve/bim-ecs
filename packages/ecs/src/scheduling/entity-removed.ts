import type { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { EcsComponent } from '../components';
import type { EntityId } from '../entities';
import { ECS_ENTITY_REMOVED } from '../entities/entities-events';
import type { QueryDefinition } from '../querying/query-definition';
import { archetypeMaskFor } from '../querying/_archetype/archetype-mask-for';
import { map } from '@bim-ecs/iterable';
import type { Archetype } from '../querying/_archetype';
import { runAtomicQueryOnSingleEntity } from '../querying/query-processing';

let idCounter = 0;

/**
 * Schedules execution on specified entity removed from world
 * @param query The filter query
 */
export function entityRemoved(
  query: QueryDefinition,
): SchedulerCtor<{ entity: EntityId; components: Iterable<EcsComponent<any>> }> {
  return class extends Scheduler<{ entity: EntityId; components: Iterable<EcsComponent<any>> }> implements Debuggable {
    readonly #queryClr = this.world.entities.querying.compile(query);
    readonly #id = idCounter++;

    /** @inheritdoc */
    public run(next: (payload: { entity: EntityId; components: Iterable<EcsComponent<any>> }) => void) {
      // Filtering
      // noinspection JSPotentiallyInvalidUsageOfThis
      this.#unsubscribe = this.world.bus.subscribe(ECS_ENTITY_REMOVED, (args) => {
        const archetype = map(args.components, (component) => component.constructor) as Archetype;
        const queryMatchesEntity = runAtomicQueryOnSingleEntity(
          {
            entity: args.entity,
            componentsMask: archetypeMaskFor(archetype, this.world.entities.querying.archetypeCache.counter),
          },
          this.#queryClr,
          {
            counter: this.world.entities.querying.archetypeCache.counter,
            indexesRepository: this.world.entities.querying.indexedComponentsCache.entitiesByComponentValues,
          },
        );

        if (!queryMatchesEntity) return;

        // Next step processing
        next(args);
      });
    }

    #unsubscribe: Function | undefined = undefined;

    get [DEBUG_NAME]() {
      return query.name ?? '#no name';
    }
    readonly [DEBUG_TYPE] = '-';
    get [DEBUG_ID]() {
      return `onEntityRemoved_${this.#id}`;
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
