import { QueryClr } from './query-clr';
import { EcsComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result';

export const withComponent =
  (definition: QueryClr) =>
  (componentType: typeof EcsComponent<any>): typeof MODIFIER_RESULT => {
    definition.with.add(componentType);
    return MODIFIER_RESULT;
  };
