import { QueryClr } from './query-clr';
import { EcsComponent } from '../../components';
import { MODIFIER_RESULT } from './modifier-result';

export const anyOf =
  (definition: QueryClr) =>
  (...componentTypes: [typeof EcsComponent<any>, ...(typeof EcsComponent<any>)[]]): typeof MODIFIER_RESULT => {
    if (componentTypes.length === 0) {
      throw new Error('anyOf requires at least one component type');
    }

    definition.anyOf.push(new Set(componentTypes));
    return MODIFIER_RESULT;
  };
