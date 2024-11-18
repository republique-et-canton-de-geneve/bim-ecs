import { map } from '@bim/iterable';
import { EcsComponent } from '../../components';

export type Archetype = Iterable<typeof EcsComponent<any>>;
export type ArchetypeMask = Uint32Array;

/**
 * Creates archetype from component instances
 * @param components The component instances from which archetype is extracted
 */
export function archetypeFromComponents(components: Iterable<EcsComponent<unknown>>) {
  return map(components, (component) => component.constructor as typeof EcsComponent<unknown>);
}
