import type { EcsEvent } from '../event-bus';
import type { EntityId } from './entity-id';
import { EcsComponent } from '../components';

export const ECS_ENTITY_SPAWNED = Symbol.for('ECS_ENTITY_SPAWNED') as EcsEvent<{
  entity: EntityId;
  components: Iterable<EcsComponent<any>>;
}>;

export const ECS_ENTITY_REMOVED = Symbol.for('ECS_ENTITY_REMOVED') as EcsEvent<{
  entity: EntityId;
  components: Iterable<EcsComponent<any>>;
}>;
