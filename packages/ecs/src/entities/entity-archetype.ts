import type { EcsComponent } from '../components';
import type { EntityId } from './entity-id';

/** A group of entities sharing the exact same set of component types */
export interface EntityArchetype {
  /** The component types of the archetype */
  readonly components: ReadonlyArray<typeof EcsComponent<any>>;
  /** The entities of the archetype (live view, do not retain it) */
  readonly entities: ReadonlySet<EntityId>;
}
