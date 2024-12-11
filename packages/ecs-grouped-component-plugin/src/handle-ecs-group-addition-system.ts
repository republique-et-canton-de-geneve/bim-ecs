import { defineSystem } from 'bim-ecs';
import { on } from 'bim-ecs/scheduling';
import { ECS_COMPONENT_LINK_ADDED } from 'bim-ecs/components';
import { ECS_GROUP_COMPONENT, type EcsGroupedComponent } from './ecs-grouped-component';

export const handleEcsGroupAdditionsSystem = defineSystem(
  'ecs group additions',
  ({ entities }, { payload: { component, entity } }) => {
    const group = (component as EcsGroupedComponent)[ECS_GROUP_COMPONENT];
    if (group) {
      const components = entities.componentsOf(entity);
      const existingGroupInstance = components.get(group);
      if (!existingGroupInstance) {
        // Creation of the group
        entities.addComponent(entity, new group(new Set([component as EcsGroupedComponent])));
      } else {
        // Enriching existing group with new link
        (existingGroupInstance.value as Set<EcsGroupedComponent>).add(component as EcsGroupedComponent);
      }
    }
  },
  on(ECS_COMPONENT_LINK_ADDED),
);
