import type { EcsWorld } from '../world'
import type { createMixinRunner } from './system-mixin-runner'

/** System factory */
export type SystemSpecification<TPayload, TReturnType> = (
  /** Related world instance */
  world: EcsWorld,
  /** System data */
  args: {
    /** The value provided by current scheduler tick */
    payload: Awaited<TPayload>
    /** The current system mixin runner */
    mixin: ReturnType<typeof createMixinRunner>
  },
) => TReturnType // | Promise<TReturnType>
