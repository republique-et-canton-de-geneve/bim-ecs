import { EcsComponent, componentAdded } from 'bim-ecs';
import { defineSystem, EcsPlugin } from 'bim-ecs';
import { DOMElementComponent } from './rendering';

export const disablingPlugin: EcsPlugin = (world) => {
  world.registerSystem(handleDisablingSystem);
};

/** Marks an entity as disabled */
export class Disabled extends EcsComponent {}

const handleDisablingSystem = defineSystem(
  'Handle disabling',
  ({ entities }, { payload }) => {
    const components = entities.componentsOf(payload.entity);
    const domElement = components.get(DOMElementComponent);
    domElement?.value.classList.add('disabled');
  },
  componentAdded(Disabled),
);
