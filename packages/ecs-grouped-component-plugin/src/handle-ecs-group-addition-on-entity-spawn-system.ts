import { defineSystem } from 'bim-ecs';
import { on } from 'bim-ecs/scheduling';
import { ECS_GROUP_COMPONENT, type EcsGroupedComponent } from './ecs-grouped-component';
import { ECS_ENTITY_SPAWNED } from 'bim-ecs/entities';
import { map } from '@bim-ecs/iterable';
import type { EcsGroupComponent } from './ecs-group-component';

export const handleEcsGroupAdditionOnEntitySpawnSystem = defineSystem(
  'ecs group spawn additions',
  ({ entities }, { payload: { components, entity } }) => {
    const groups = new Map(
      map(components, (component) => [
        (component as EcsGroupedComponent)[ECS_GROUP_COMPONENT] as new (
          set: Set<EcsGroupedComponent>,
        ) => EcsGroupComponent,
        component as EcsGroupedComponent,
      ]),
    );

    for (const [group, component] of groups) {
      if (group) {
        entities.addComponent(entity, new group(new Set([component])));
      }
    }

    const existingGroups = new Map<typeof EcsGroupComponent, EcsGroupComponent>();
    for (const component of components) {
      const group = (component as EcsGroupedComponent)[ECS_GROUP_COMPONENT];
      if (group) {
        const existingGroup = existingGroups.get(group);
        if (existingGroup) {
          (existingGroup.value as Set<EcsGroupedComponent>).add(component as EcsGroupedComponent);
        } else {
          entities.addComponent(entity, new group(new Set([component as EcsGroupedComponent])));
        }
      }
    }
  },
  on(ECS_ENTITY_SPAWNED),
);
