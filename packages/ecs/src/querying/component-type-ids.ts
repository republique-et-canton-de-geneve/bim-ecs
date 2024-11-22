import { EcsComponent } from '../components';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter';

/** The component ID flag property key */
export const COMPONENT_ID_FLAG = Symbol('Component type identifier');

/**
 * Provides component type id for specified component constructor
 * @param type Component type
 * @param counter Id factory strategy
 */
export function getComponentTypeId(
  type: typeof EcsComponent & { [COMPONENT_ID_FLAG]?: Uint32Array },
  counter: ComponentTypeIdFlagCounter,
) {
  return (
    type[COMPONENT_ID_FLAG] ?? // Existing value case
    (type[COMPONENT_ID_FLAG] = counter.next()) // New value case
  );
}
