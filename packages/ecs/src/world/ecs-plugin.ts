import type { EcsWorld } from './ecs-world'

export type EcsPlugin = (world: EcsWorld) => unknown
