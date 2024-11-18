import { QueryClr } from './query-clr.ts';
import { EcsComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result.ts';

export const withComponent =
  (definition: QueryClr) =>
  (componentType: typeof EcsComponent<any>): typeof MODIFIER_RESULT => {
    definition.with.add(componentType);
    return MODIFIER_RESULT;
  };
