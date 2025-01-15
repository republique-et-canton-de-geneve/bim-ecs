import { defineSystem, on, ECS_COMPONENT_LINK_REMOVED } from 'bim-ecs';
import { ECS_GROUP_COMPONENT, type EcsGroupedComponent } from './ecs-grouped-component';

export const handleEcsGroupDeletionsSystem = defineSystem(
  'ecs group deletion',
  ({ entities }, { payload: { component, entity } }) => {
    const group = (component as EcsGroupedComponent)[ECS_GROUP_COMPONENT];
    if (group) {
      const components = entities.componentsOf(entity);
      const existingGroupInstance = components.get(group);
      if (existingGroupInstance) {
        (existingGroupInstance.value as Set<EcsGroupedComponent>).delete(component as EcsGroupedComponent);
        if (!existingGroupInstance.value.size) {
          entities.removeComponent(entity, group);
        }
      }
    }
  },
  on(ECS_COMPONENT_LINK_REMOVED),
);
