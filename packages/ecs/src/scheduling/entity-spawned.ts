import { SchedulerCtor } from './scheduler-constructor';
import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';
import { EcsComponent } from '../components';
import { EntityId } from '../entities';
import { ECS_ENTITY_SPAWNED } from '../entities/entities-events';
import { QueryDefinition } from '../querying/query-definition';
import { archetypeMaskFor } from '../querying/_archetype/archetype-mask-for';
import { map } from '@bim/iterable';
import { Archetype } from '../querying/_archetype';
import {
  runAtomicQueryOnSingleEntity,
  runQueryChunkOnArchetypeMask,
  runQueryChunkOnEntity,
} from '../querying/query-processing';

let idCounter = 0;

/**
 * Schedules execution on specified entity spawned
 * @param query The filter query
 */
export function spawned(
  query: QueryDefinition,
): SchedulerCtor<{ entity: EntityId; components: Iterable<EcsComponent<any>> }> {
  return class extends Scheduler<{ entity: EntityId; components: Iterable<EcsComponent<any>> }> implements Debuggable {
    readonly #queryClr = this.world.query.compile(query);
    readonly #id = idCounter++;

    #resolveNext: ((value: { entity: EntityId; components: Iterable<EcsComponent<any>> }) => void) | null = null;

    /** Pending event payloads */
    readonly #eventPayloadsQueue: { entity: EntityId; components: Iterable<EcsComponent<any>> }[] = [];

    #unsubscribe: Function = this.world.bus.subscribe(ECS_ENTITY_SPAWNED, (args) => {
      const archetype = map(args.components, (component) => component.constructor) as Archetype;
      const queryMatchesEntity = runAtomicQueryOnSingleEntity(
        {
          entity: args.entity,
          componentsMask: archetypeMaskFor(archetype, this.world.query.archetypeCache.counter),
        },
        this.#queryClr,
        {
          counter: this.world.query.archetypeCache.counter,
          indexesRepository: this.world.query.indexedComponentsCache.entitiesByComponentValues,
        },
      );
      if (!queryMatchesEntity) return;

      if (this.#resolveNext) {
        // Executing immediately
        this.#resolveNext(args);
        this.#resolveNext = null;
      } else {
        // Stacking data
        this.#eventPayloadsQueue.push(args);
      }
    });

    get [DEBUG_NAME]() {
      return query.name ?? '#no name';
    }
    readonly [DEBUG_TYPE] = '☄';
    get [DEBUG_ID]() {
      return `onSpawned_${this.#id}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [];
    }

    /** @inheritdoc */
    getIteratorImplementation() {
      const setResolver = (
        resolver: (value: { entity: EntityId; components: Iterable<EcsComponent<any>> }) => void,
      ) => {
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
          return new Promise<IteratorResult<{ entity: EntityId; components: Iterable<EcsComponent<any>> }>>(
            (resolve) => {
              /** @inheritdoc */
              setResolver((value) => resolve({ value, done: false }));
            },
          );
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
