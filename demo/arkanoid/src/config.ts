import { EcsResource } from '@bim/ecs/resources';

export class Config extends EcsResource {
  width = 500;
  height = 300;

  columns = 10;
  rows = 13;

  ballRadius = 8;

  plateHeight = 8;
  plateWidth = 38;
  plateBallDeviationSensitivity = 1.8;

  noTrapMode = false;
}
