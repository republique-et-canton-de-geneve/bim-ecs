import { QueryClr } from './query-clr';
import type { EcsIndexedComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result';

export const withValue =
  (definition: QueryClr) =>
  <TValue>(componentType: typeof EcsIndexedComponent<TValue>, value: TValue): typeof MODIFIER_RESULT => {
    definition.withValue.push([componentType, value]);
    return MODIFIER_RESULT;
  };
