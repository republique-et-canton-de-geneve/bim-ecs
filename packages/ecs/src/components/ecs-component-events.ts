import type { EcsEvent } from '../event-bus';
import type { EntityId } from '../entities/entity-id';
import type { EcsComponent } from './ecs-component';

export const ECS_COMPONENT_LINK_ADDED = Symbol('ECS_COMPONENT_LINK_ADDED') as EcsEvent<{
  component: EcsComponent<any>;
  entity: EntityId;
}>;

export const ECS_COMPONENT_LINK_REMOVED = Symbol('ECS_COMPONENT_LINK_REMOVED') as EcsEvent<{
  component: EcsComponent<any>;
  entity: EntityId;
}>;
