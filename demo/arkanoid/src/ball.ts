import { EcsComponent } from 'bim-ecs/components';
import { defineSystem, EcsPlugin } from 'bim-ecs';
import { frame, startup } from 'bim-ecs/scheduling';
import { BoxGeometry } from './box-geometry';
import { Config } from './config';
import { Name } from './common';
import { Velocity } from './velocity';
import { BallCollisionTrigger } from './ball-collision-trigger';
import { Disabled } from './disabling';

export const ballPlugin: EcsPlugin = (world) => {
  world.registerSystem(initializeBallSystem);
  world.registerSystem(updateBallSystem);
};

export class Ball extends EcsComponent {}

export const initializeBallSystem = defineSystem(
  'Init ball',
  ({ entities, container }) => {
    const config = container.resolve(Config);
    entities.spawn(
      new Ball(),
      new Name('ball'),
      new BoxGeometry({
        x: config.width * 0.5,
        y: config.height - 20,
        width: config.ballRadius,
        height: config.ballRadius,
      }),
      new Velocity({ ...config.ballInitialVelocity }),
    );
  },
  startup,
);

export const updateBallSystem = defineSystem(
  'Update ball',
  ({ entities, query, container, bus }) => {
    const config = container.resolve(Config);

    for (const ball of query.execute(() => [Ball, BoxGeometry, Velocity])) {
      const ballComponents = entities.componentsOf(ball);
      const boxGeometry = ballComponents.get(BoxGeometry)! as BoxGeometry;
      const velocity = ballComponents.get(Velocity)! as Velocity;

      const obstacles = query.execute(({ without }) => [BoxGeometry, without(Ball), without(Disabled)]);

      for (const obstacle of obstacles) {
        const components = entities.componentsOf(obstacle);
        const obstacleGeometry = components.get(BoxGeometry)! as BoxGeometry;
        const isColliding = obstacleGeometry.isCollidingWith(boxGeometry);
        if (isColliding) {
          if ((isColliding === 'top' && velocity.value.y > 0) || (isColliding === 'bottom' && velocity.value.y < 0)) {
            velocity.invertY();
          } else if (
            (isColliding === 'left' && velocity.value.x > 0) ||
            (isColliding === 'right' && velocity.value.x < 0)
          ) {
            velocity.invertX();
          }

          // Publishing dedicated collision event
          const event = components.get(BallCollisionTrigger)?.value;
          if (event) bus.publish(event, { ball, obstacle });
          break;
        }
      }

      if (
        (velocity.value.x < 0 && boxGeometry.value.x < config.ballRadius) || // left border
        (velocity.value.x > 0 && boxGeometry.value.x > config.width - config.ballRadius) // right border
      ) {
        velocity.invertX();
      }

      // top border
      if (velocity.value.y < 0 && boxGeometry.value.y < config.ballRadius) {
        velocity.invertY();
      }

      // bottom border -> ball lost
      if (velocity.value.y > 0 && boxGeometry.value.y > config.height - config.ballRadius) {
        if (config.noTrapMode)
          velocity.invertY(); // cheat mode -> ball is bouncing at bottom
        else entities.remove(ball);
      }

      velocity.applyOnBoxGeometry(boxGeometry);
    }
  },
  frame,
);
