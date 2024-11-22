import { QueryClr } from './query-clr';
import { EcsComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result';

export const without =
  (definition: QueryClr) =>
  (componentType: typeof EcsComponent<any>): typeof MODIFIER_RESULT => {
    definition.without.add(componentType);
    return MODIFIER_RESULT;
  };
