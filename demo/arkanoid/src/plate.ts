import { defineSystem, EcsPlugin } from '@bim/ecs';
import { on, startup } from '@bim/ecs/scheduling';
import { Config } from './config.ts';
import { EcsComponent } from '@bim/ecs/components';
import { BoxGeometry } from './box-geometry.ts';
import { pointerMoveEvent } from './inputs.ts';
import { Name } from './common.ts';

export const platePlugin: EcsPlugin = (world) => {
  world.registerSystem(initializePlateSystem);
  world.registerSystem(updatePlateSystem);
};

export class Plate extends EcsComponent {}

export const initializePlateSystem = defineSystem(
  'Init plate',
  ({ entities, container }) => {
    const config = container.resolve(Config);

    entities.spawn(
      new Plate(),
      new Name('plate'),
      new BoxGeometry({
        x: config.width * 0.5,
        y: config.height - config.plateHeight * 0.5,
        height: config.plateHeight,
        width: config.plateWidth,
      }),
    );
  },
  startup,
);

export const updatePlateSystem = defineSystem(
  'Update plate',
  ({ query, entities, container }, { payload }) => {
    const plate = query.execute(() => [Plate, BoxGeometry]).next().value;
    if (plate !== undefined) {
      const config = container.resolve(Config);
      const components = entities.componentsOf(plate);
      const boxGeometry = components.get(BoxGeometry)! as BoxGeometry; // TODO: infer type
      const limitLeft = boxGeometry.value.width * 0.5;
      const limitRight = config.width - limitLeft;
      boxGeometry.set({ ...boxGeometry.value, x: Math.min(limitRight, Math.max(limitLeft, payload.scenePosition.x)) });
    }
  },
  on(pointerMoveEvent),
);
