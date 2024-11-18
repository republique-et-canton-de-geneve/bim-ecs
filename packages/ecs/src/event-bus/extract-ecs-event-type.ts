import type { EcsEvent } from './ecs-event'

export type ExtractEcsEventType<P> = P extends EcsEvent<infer T> ? T : never
