import { EcsResource } from '@bim/ecs/resources';

export class Config extends EcsResource {
  width = 500;
  height = 300;

  columns = 10;
  rows = 13;

  ballRadius = 10;
  plateHeight = 10;
  plateWidth = 60;
}
