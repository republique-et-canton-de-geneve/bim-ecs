import type { EcsResourceKey } from './ecs-resource-key'

export type ExtractEcsResourceKeyType<P> = P extends EcsResourceKey<infer T> ? T : never
