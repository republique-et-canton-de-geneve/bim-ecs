import { EcsWorld } from '../world';
import { filter, flatMap } from '@bim/iterable';
import { ArchetypeCache } from './_archetype/archetype-cache';
import { QueryDefinition } from './query-definition';
import { runQueryChunkOnArchetypeMask, runQueryChunkOnEntity } from './query-processing';
import { compileQueryDefinition } from './compile-query';
import { IndexedComponentsCache } from './_indexed-components/indexed-components-cache';

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
   * Performs the compilation step of the query from definition
   * @param queryDefinition The query definition to compile
   * @returns Compiled query
   */
  public compile(queryDefinition: QueryDefinition) {
    return compileQueryDefinition(queryDefinition);
  }

  /**
   * Evaluates the compiled query and renders the result
   * @param shell The compiled query
   */
  public run(shell: ReturnType<QueryEngine['compile']>) {
    // Processing query through archetypes
    const matchingArchetypeMasks = filter(this.archetypeCache.entitiesByArchetypeMask.keys(), (mask) =>
      runQueryChunkOnArchetypeMask(shell, mask, this.archetypeCache.counter),
    );
    const fromArchetypesResult = flatMap(
      matchingArchetypeMasks,
      (mask) => this.archetypeCache.entitiesByArchetypeMask.get(mask) ?? [],
    );

    // Processing result through indexes query
    return filter(fromArchetypesResult, (entity) =>
      runQueryChunkOnEntity(entity, shell, this.indexedComponentsCache.entitiesByComponentValues),
    );
  }

  /** @inheritDoc */
  [Symbol.dispose]() {
    this.archetypeCache[Symbol.dispose]();
  }
}
