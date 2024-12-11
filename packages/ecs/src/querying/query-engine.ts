import { EcsWorld } from '../world';
import { filter, flatMap } from '@bim-ecs/iterable';
import { ArchetypeCache } from './_archetype/archetype-cache';
import type { QueryDefinition } from './query-definition';
import { runQueryChunkOnArchetypeMask } from './query-processing';
import { compileQueryDefinition } from './compile-query';
import { IndexedComponentsCache } from './_indexed-components/indexed-components-cache';
import type { EntityId } from '../entities';

/**
 * Handles ECS querying
 */
export class QueryEngine implements Disposable {
  /** Entity archetype cache */
  public readonly archetypeCache: ArchetypeCache;
  public readonly indexedComponentsCache: IndexedComponentsCache;

  constructor(private readonly world: Pick<EcsWorld, 'bus' | 'entities'>) {
    this.archetypeCache = new ArchetypeCache(this.world);
    this.indexedComponentsCache = new IndexedComponentsCache(this.world);
  }

  /**
   * Executes a query from definition
   * @param queryDefinition The query definition
   * @returns The query result
   */
  public execute(queryDefinition: QueryDefinition) {
    const shell = this.compile(queryDefinition);
    return this.run(shell);
  }

  /**
   * Executes a query from definition
   * @param queryDefinition The query definition
   * @returns The query result
   */
  public executeOne(queryDefinition: QueryDefinition) {
    return this.execute(queryDefinition).next().value as EntityId;
  }

  /**
   * Performs the compilation step of the query from definition
   * @param queryDefinition The query definition to compile
   * @returns Compiled query
   */
  public compile(queryDefinition: QueryDefinition) {
    return compileQueryDefinition(queryDefinition);
  }

  /**
   * Evaluates the compiled query and renders the result
   * @param queryClr The compiled query
   */
  public run(queryClr: ReturnType<QueryEngine['compile']>) {
    return this.createQueryExecutionPlan(queryClr)();
  }

  public createQueryExecutionPlan(queryClr: ReturnType<QueryEngine['compile']>): () => Generator<EntityId> {
    // Processing query through archetypes
    /** Archetype masks matching the current query (to be unionised) */
    const matchingArchetypeMasks = filter(this.archetypeCache.entitiesByArchetypeMask.keys(), (mask) =>
      runQueryChunkOnArchetypeMask(queryClr, mask, this.archetypeCache.counter),
    );

    // scoping caches
    const archetypeCache = this.archetypeCache;

    // CASE 1: archetype only
    if (!queryClr.withValue.length) {
      return runQueryFromArchetypeOnlyStrategy;
    }

    /** Smallest indexed entity set matching current query (entity sets needs to be intersected) */
    let smallestIndexedEntitySet = null as Set<EntityId> | null;
    const fromIndexesEntitySetsResult = queryClr.withValue.map((withValueEntry) => {
      const entities = this.indexedComponentsCache.entitiesByComponentValues.get(withValueEntry)!;
      if (entities.size < (smallestIndexedEntitySet?.size ?? Number.MAX_SAFE_INTEGER)) {
        smallestIndexedEntitySet = entities;
      }

      return entities;
    });

    /** Indexes sets larger than the one to be used as primary source or primary comparator (to be intersected) */
    const largerIndexesEntitySetsResult = fromIndexesEntitySetsResult.filter((set) => set !== smallestIndexedEntitySet);

    // CASE 2: indexed values only
    if (queryClr.withValue.length && !queryClr.without.size && !queryClr.with.size) {
      return runQueryFromIndexesOnlyStrategy;
    }

    if (!smallestIndexedEntitySet?.size) return runVoidStrategy; // No match case

    /** Masked entity set matching current query */
    const archetypeEntitySet = new Set(
      flatMap(matchingArchetypeMasks, (mask) => this.archetypeCache.entitiesByArchetypeMask.get(mask)!),
    );

    // CASE 3: less indexed result than masked
    if (smallestIndexedEntitySet.size < archetypeEntitySet.size) {
      return runQueryFromIndexesStrategy;
    }

    // CASE 4: less masked result than indexed
    return runQueryFromArchetypeStrategy;

    /** Strategy shortcut with no result */
    function* runVoidStrategy(): Generator<EntityId> {
      return;
    }

    /** Strategy using only archetype masks as input for query processing */
    function runQueryFromArchetypeOnlyStrategy() {
      return flatMap(matchingArchetypeMasks, (mask) => archetypeCache.entitiesByArchetypeMask.get(mask) ?? []);
    }

    /** Strategy using only indexes as input for query processing */
    function runQueryFromIndexesOnlyStrategy() {
      return filter(smallestIndexedEntitySet!, (entity) =>
        largerIndexesEntitySetsResult.every((set) => set!.has(entity)),
      );
    }

    /** Strategy using archetype masks as primary source for query processing */
    function runQueryFromArchetypeStrategy() {
      return filter(
        archetypeEntitySet,
        (entity) =>
          smallestIndexedEntitySet?.has(entity) && largerIndexesEntitySetsResult.every((set) => set!.has(entity)), // Starting with the smallest set to maximize chances not to go through "every statement"
      );
    }

    /** Strategy using indexes as primary source for query processing */
    function runQueryFromIndexesStrategy() {
      return filter(
        smallestIndexedEntitySet!,
        (entity) => archetypeEntitySet.has(entity) && largerIndexesEntitySetsResult.every((set) => set!.has(entity)),
      );
    }
  }

  /** @inheritDoc */
  [Symbol.dispose]() {
    this.archetypeCache[Symbol.dispose]();
  }
}
