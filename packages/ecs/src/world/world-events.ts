import type { EcsEvent } from '../event-bus'

/** Occurs when the world is being running */
export const ECS_WORLD_RUNNING_EVENT = Symbol('WORLD_PROCESSING_EVENT') as EcsEvent<{
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>
}>

/** Occurs when the world is being stopping */
export const ECS_WORLD_STOPPING_EVENT = Symbol('WORLD_STOPPING_EVENT') as EcsEvent<{
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>
}>

/** Occurs when the world is being disposing */
export const ECS_WORLD_DISPOSING_EVENT = Symbol('WORLD_DISPOSING_EVENT') as EcsEvent<{
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>
}>
