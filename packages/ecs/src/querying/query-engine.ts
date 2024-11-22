import { EcsWorld } from '../world';
import { filter, flatMap } from '@bim/iterable';
import type { EcsComponent } from '../components';
import { MODIFIER_RESULT } from './_builder/modifier-result';
import { archetypeMaskExcluded, archetypeMaskIncluded } from './_archetype/archetype-mask-operations';
import { QueryClr } from './_builder/query-clr';
import { without } from './_builder/without';
import { withValue } from './_builder/with-value';
import { withComponent } from './_builder/with-component';
import { archetypeMaskFor } from './_archetype/archetype-mask-for';
import { ArchetypeCache } from './_archetype/archetype-cache';
import { QueryDefinition } from './query-definition';
import { ArchetypeMask } from './_archetype';
import { runQueryOnArchetypeMask } from './run-query-on-archetype-mask';
import { compileQueryDefinition } from './compile-query';

/**
 * Handles ECS querying
 */
export class QueryEngine implements Disposable {
  /** Entity archetype cache */
  public readonly cache: ArchetypeCache;

  constructor(private readonly world: Pick<EcsWorld, 'bus' | 'entities'>) {
    this.cache = new ArchetypeCache(this.world);
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
    const matchingArchetypeMasks = filter(this.cache.entitiesByArchetypeMask.keys(), (mask) =>
      runQueryOnArchetypeMask(shell, mask, this.cache.counter),
    );

    // Rendering result
    return flatMap(matchingArchetypeMasks, (mask) => this.cache.entitiesByArchetypeMask.get(mask) ?? []);
  }

  /** @inheritDoc */
  [Symbol.dispose]() {
    this.cache[Symbol.dispose]();
  }
}
