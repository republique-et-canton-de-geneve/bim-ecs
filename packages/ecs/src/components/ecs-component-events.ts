import type { EcsEvent } from '../event-bus';
import type { EntityId } from '../entities';
import type { EcsComponent } from './ecs-component';
import type { EcsMutableComponent } from './ecs-mutable-component';

export const ECS_COMPONENT_LINK_ADDED = Symbol('ECS_COMPONENT_LINK_ADDED') as EcsEvent<{
  component: EcsComponent<any>;
  entity: EntityId;
}>;

export const ECS_COMPONENT_LINK_REMOVED = Symbol('ECS_COMPONENT_LINK_REMOVED') as EcsEvent<{
  component: EcsComponent<any>;
  entity: EntityId;
}>;

export const ECS_MUTABLE_COMPONENT_VALUE_CHANGED = Symbol('ECS_MUTABLE_COMPONENT_VALUE_CHANGED') as EcsEvent<{
  component: EcsMutableComponent<any>;
  entities: Iterable<EntityId>;
  newValue: any;
  oldValue: any;
}>;
