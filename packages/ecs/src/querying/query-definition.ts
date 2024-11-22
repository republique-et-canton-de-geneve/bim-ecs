import { QueryModifiers } from './_builder/query-modifiers';
import type { EcsComponent } from '../components';
import { MODIFIER_RESULT } from './_builder/modifier-result';

/** A developer friendly Query definition (to be used in ECS public API) */
export type QueryDefinition = (
  modifiers: QueryModifiers,
) => Iterable<typeof EcsComponent<any> | typeof MODIFIER_RESULT>;
