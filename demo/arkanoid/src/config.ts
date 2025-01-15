import { EcsResource } from 'bim-ecs';

export class Config extends EcsResource {
  width = 600;
  height = 300;

  columns = 12;
  rows = 13;

  ballRadius = 8;
  ballInitialVelocity = {
    x: 2,
    y: -2,
  };

  plateHeight = 8;
  plateWidth = 38;
  plateBallDeviationSensitivity = 1.8;

  /** Cheat mode (useful in dev env) */
  noTrapMode = false;
}
