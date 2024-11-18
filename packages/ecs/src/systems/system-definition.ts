import type { EcsWorld } from '../world'
import type { SystemRunner } from './system-runner'
import {
  type defineSystem,
  SYSTEM_DEFINITION_ID_KEY,
  SYSTEM_DEFINITION_OPTIONS_KEY,
} from './define-system'

/** A defined system */
export type SystemDefinition<TPayload, TReturnType = any> = (
  world: EcsWorld,
) => SystemRunner<TPayload, TReturnType>

/** A defined system with identifier */
export type SystemDefinitionWithId<TPayload> = SystemDefinition<TPayload> & {
  [SYSTEM_DEFINITION_ID_KEY]: number
  [SYSTEM_DEFINITION_OPTIONS_KEY]: Parameters<typeof defineSystem>[3]
}
