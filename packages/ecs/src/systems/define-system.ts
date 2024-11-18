import type { EcsWorld } from '../world'
import type { SystemSpecification } from './system-specification'
import { SystemRunner } from './system-runner'
import type { SchedulerCtor } from '../scheduling/scheduler-constructor'
import type { EcsEvent } from '../event-bus'
import type { EcsCommand } from './commands'

/** Global id counter referential */
let idCounter = 1

/** System definition identifier key */
export const SYSTEM_DEFINITION_ID_KEY = Symbol('System definition id')
export const SYSTEM_DEFINITION_OPTIONS_KEY = Symbol('System definition options')

/**
 * Creates a new system with scheduling association
 * @param name A user-friendly label
 * @param system The system implementation
 * @param scheduler The associated scheduler
 * @param options System options
 */
export function defineSystem<TPayload, TReturnType>(
  name: string,
  system: SystemSpecification<TPayload, TReturnType>,
  scheduler: SchedulerCtor<TPayload>,
  options?: {
    maxLogLevel?: 'info' | 'debug'
    then?: {
      publish?: EcsEvent<TReturnType>
      trigger?: EcsCommand<TReturnType>
    }
  },
) {
  const id = idCounter++

  return Object.assign(
    (world: EcsWorld) => {
      const runner = new SystemRunner(name, id, { system, scheduler, world }, options)
      world.debug.track(runner)
      return runner
    },
    {
      [SYSTEM_DEFINITION_ID_KEY]: id,
      [SYSTEM_DEFINITION_OPTIONS_KEY]: options,
    },
  ) as (world: EcsWorld) => SystemRunner<TPayload, TReturnType>
}
