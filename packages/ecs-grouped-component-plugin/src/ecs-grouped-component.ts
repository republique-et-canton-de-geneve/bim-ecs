import { EcsComponent } from 'bim-ecs';
import type { EcsGroupComponent } from './ecs-group-component';

export const ECS_GROUP_COMPONENT = Symbol('ECS GROUP COMPONENT KEY');

export interface EcsGroupedComponent<T = any> extends EcsComponent<T> {
  readonly [ECS_GROUP_COMPONENT]: new (children: ReadonlySet<EcsGroupedComponent<any>>) => EcsGroupComponent;
}
