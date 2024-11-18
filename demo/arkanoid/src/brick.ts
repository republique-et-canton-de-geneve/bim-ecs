import { defineSystem, EcsPlugin } from '@bim/ecs';
import { on, startup } from '@bim/ecs/scheduling';
import { Config } from './config.ts';
import { EcsComponent } from '@bim/ecs/components';
import { BoxGeometry } from './box-geometry.ts';
import { Name } from './common.ts';
import { BallCollisionTrigger } from './ball-collision-trigger.ts';
import { EcsEvent } from '@bim/ecs/event-bus';
import { EntityId } from '@bim/ecs/entities';
import { Disabled } from './disabling.ts';

export const bricksPlugin: EcsPlugin = (world) => {
  world.registerSystem(initializeBricksSystem);
  world.registerSystem(handleBrickCollisionSystem);
};

// Marker
export class Brick extends EcsComponent {}

// Data
export class BrickRowIndex extends EcsComponent<number> {}
export class BrickColumnIndex extends EcsComponent<number> {}

// Events
export const brickCollisionEvent = Symbol('brickCollisionEvent') as EcsEvent<EntityId>;

// Systems
export const initializeBricksSystem = defineSystem(
  'Init bricks',
  ({ entities, container }) => {
    const config = container.resolve(Config);

    for (let row = 0; row < config.rows; row++) {
      for (let column = 0; column < config.columns; column++) {
        entities.spawn(
          new Brick(),
          new Name('brick'),
          new BrickRowIndex(row),
          new BrickColumnIndex(column),
          new BallCollisionTrigger(brickCollisionEvent),
          BoxGeometry.createFromIndices({ row, column }, { ...config, height: config.height * 0.7 }),
        );
      }
    }
  },
  startup,
);

export const handleBrickCollisionSystem = defineSystem(
  'Handle brick collided',
  ({ entities }, { payload }) => {
    entities.addComponent(payload, new Disabled());
  },
  on(brickCollisionEvent),
);
