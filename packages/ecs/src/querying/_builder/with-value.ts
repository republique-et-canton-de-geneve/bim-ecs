import { QueryClr } from './query-clr.ts';
import { EcsComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result.ts';

export const withValue =
  (definition: QueryClr) =>
  <TValue>(componentType: typeof EcsComponent<TValue>, value: TValue): typeof MODIFIER_RESULT => {
    definition.withValue.set(componentType, value);
    return MODIFIER_RESULT;
  };
