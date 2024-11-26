import { defineSystem, EcsPlugin } from '@bim/ecs';
import { on, startup } from '@bim/ecs/scheduling';
import { Config } from './config';
import { EcsComponent } from '@bim/ecs/components';
import { BoxGeometry } from './box-geometry';
import { pointerMoveEvent } from './inputs';
import { Name } from './common';
import { EcsEvent } from '@bim/ecs/event-bus';
import { EntityId } from '@bim/ecs/entities';
import { BallCollisionTrigger } from './ball-collision-trigger';
import { Velocity } from './velocity';

export const platePlugin: EcsPlugin = (world) => {
  world.registerSystem(initializePlateSystem);
  world.registerSystem(updatePlateSystem);
  world.registerSystem(handlePlateCollisionSystem);
};

// Events
export const plateCollisionEvent = Symbol('plateCollisionEvent') as EcsEvent<{ obstacle: EntityId; ball: EntityId }>;

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
      new BallCollisionTrigger(plateCollisionEvent),
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
      boxGeometry.value = {
        ...boxGeometry.value,
        x: Math.min(limitRight, Math.max(limitLeft, payload.scenePosition.x)),
      };
    }
  },
  on(pointerMoveEvent),
);

export const handlePlateCollisionSystem = defineSystem(
  'Handle plate collision',
  ({ entities, container }, { payload: { ball, obstacle: plate } }) => {
    const plateGeometry = entities.componentsOf(plate).get(BoxGeometry)?.value;
    const ballComponents = entities.componentsOf(ball);
    const ballGeometry = ballComponents.get(BoxGeometry)?.value;
    const ballVelocity = ballComponents.get(Velocity)?.value;

    if (plateGeometry && ballGeometry && ballVelocity) {
      const config = container.resolve(Config);

      // Calculate horizontal distance between centers
      const distanceFromCenter = ballGeometry.x - plateGeometry.x;

      // Normalize distance based on plate width
      const normalizedDistance = (2 * distanceFromCenter) / plateGeometry.width;

      // Updating velocity accordingly
      ballVelocity.x += normalizedDistance * config.plateBallDeviationSensitivity; // Adjust deviationFactor as needed
    }
  },
  on(plateCollisionEvent),
);
