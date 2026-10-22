import { QueryClr } from './_builder/query-clr';
import type { ArchetypeMask } from './_archetype';
import {
  archetypeMaskExcluded,
  archetypeMaskIncluded,
  archetypeMaskIntersecting,
} from './_archetype/archetype-mask-operations';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter';
import type { EntityId } from '../entities';
import { EcsIndexedComponent } from '../components';
import { TupleMap } from '@bim-ecs/tuple-collections';

/**
 * Processes query onto archetype mask
 * > 1rst query pass
 * @param queryClr The compiled query ('with' | 'without' | 'anyOf' parts are processed only)
 * @param mask The tested mask value
 * @param counter The Component type id factory strategy to be used to handle id mask creation
 * @returns true if the mask matches the query, false otherwise
 */
export function runQueryChunkOnArchetypeMask(
  queryClr: Pick<QueryClr, 'compiledMasks'>,
  mask: ArchetypeMask,
  counter: ComponentTypeIdFlagCounter,
) {
  const { include, exclude, anyOf } = queryClr.compiledMasks(counter);

  if (!archetypeMaskIncluded(include, mask)) return false; // "with" | "withValueComponents" processing
  if (!archetypeMaskExcluded(exclude, mask)) return false; // "without" processing ("not" operator)
  for (let i = 0; i < anyOf.length; i++) {
    if (!archetypeMaskIntersecting(anyOf[i], mask)) return false; // "anyOf" processing ("or" operator)
  }

  return true;
}

/**
 * Processes index query part on entity
 * > 2nd query pass
 * @param entity The entity value
 * @param queryClr The compiled query ('withValue' part is processed only)
 * @param indexesRepository The index repository
 * @returns true if entity matches the query, false otherwise
 */
export function runQueryChunkOnIndexEntity(
  entity: EntityId,
  queryClr: Pick<QueryClr, 'withValue'>,
  indexesRepository: TupleMap<[typeof EcsIndexedComponent<any>, any], Set<EntityId>>,
) {
  return (
    !queryClr.withValue.length ||
    queryClr.withValue.every((valueQuery) => indexesRepository.get(valueQuery)?.has(entity))
  );
}

/** Processes a query on atomic entity bundle */
export function runAtomicQueryOnSingleEntity(
  entityBundle: { entity: EntityId; componentsMask: ArchetypeMask },
  queryClr: QueryClr,
  context: {
    indexesRepository: TupleMap<[typeof EcsIndexedComponent<any>, any], Set<EntityId>>;
    counter: ComponentTypeIdFlagCounter;
  },
) {
  return (
    runQueryChunkOnArchetypeMask(queryClr, entityBundle.componentsMask, context.counter) &&
    runQueryChunkOnIndexEntity(entityBundle.entity, queryClr, context.indexesRepository)
  );
}
