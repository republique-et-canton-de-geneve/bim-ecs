import { defineSystem, EcsPlugin } from 'bim-ecs';
import { on, startup } from 'bim-ecs/scheduling';
import { Config } from './config';
import { EcsComponent } from 'bim-ecs/components';
import { BoxGeometry } from './box-geometry';
import { Name } from './common';
import { BallCollisionTrigger } from './ball-collision-trigger';
import { EcsEvent } from 'bim-ecs/event-bus';
import { EntityId } from 'bim-ecs/entities';
import { Disabled } from './disabling';

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
export const brickCollisionEvent = Symbol('brickCollisionEvent') as EcsEvent<{ obstacle: EntityId; ball: EntityId }>;

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
  ({ entities }, { payload: { obstacle } }) => {
    entities.addComponent(obstacle, new Disabled());
  },
  on(brickCollisionEvent),
);
