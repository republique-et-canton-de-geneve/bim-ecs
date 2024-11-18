import { QueryClr } from './query-clr.ts';
import { EcsComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result.ts';

export const without =
  (definition: QueryClr) =>
  (componentType: typeof EcsComponent<any>): typeof MODIFIER_RESULT => {
    definition.without.add(componentType);
    return MODIFIER_RESULT;
  };
