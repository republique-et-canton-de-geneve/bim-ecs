import { EcsComponent } from 'bim-ecs/components';
import type { EcsGroupComponent } from './ecs-group-component';

export const ECS_GROUP_COMPONENT = Symbol('ECS GROUP COMPONENT KEY');

export interface EcsGroupedComponent extends EcsComponent {
  readonly [ECS_GROUP_COMPONENT]: new (children: ReadonlySet<EcsGroupedComponent>) => EcsGroupComponent;
}
