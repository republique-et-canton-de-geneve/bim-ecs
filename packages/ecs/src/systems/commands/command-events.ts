import type { EcsCommand } from './ecs-command'
import type { EcsEvent } from '../../event-bus'

export const ECS_COMMAND_EVENT = Symbol('ECS_COMMAND_EVENT') as EcsEvent<{
  command: EcsCommand<any>
  payload: any
}>
