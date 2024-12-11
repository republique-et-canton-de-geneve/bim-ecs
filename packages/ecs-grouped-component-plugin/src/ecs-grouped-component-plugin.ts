import type { EcsPlugin } from 'bim-ecs';
import { handleEcsGroupDeletionsSystem } from './handle-ecs-group-deletion-system';
import { handleEcsGroupAdditionsSystem } from './handle-ecs-group-addition-system';
import { handleEcsGroupAdditionOnEntitySpawnSystem } from './handle-ecs-group-addition-on-entity-spawn-system';

export const ecsGroupedComponentPlugin: EcsPlugin = (world) => {
  world.registerSystem(handleEcsGroupAdditionsSystem);
  world.registerSystem(handleEcsGroupDeletionsSystem);
  world.registerSystem(handleEcsGroupAdditionOnEntitySpawnSystem);
};
