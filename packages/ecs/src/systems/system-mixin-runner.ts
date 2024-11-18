import { EcsWorld } from '../world'
import type { defineMixin } from './define-mixin'
import {
  ECS_SYSTEM_MIXIN_PROCESSED_EVENT,
  ECS_SYSTEM_MIXIN_PROCESSING_EVENT,
} from './system-events'

/** Handles mixin execution within system context */
export class SystemMixinRunner {
  constructor(
    /** The ECS world instance */
    private readonly world: EcsWorld,
    /** The identifier of the system in which the mixin is executed */
    private readonly systemId: number,
  ) {}

  /**
   * Runs the specified mixin definition in current system context
   * @param mixinDefinition The mixin definition
   * @param payload The mixin payload
   */
  public run<TPayload>(
    mixinDefinition: ReturnType<typeof defineMixin<TPayload>>,
    payload: Awaited<TPayload>,
  ) {
    // Pre processing event
    this.world.bus.publish(ECS_SYSTEM_MIXIN_PROCESSING_EVENT, {
      name: mixinDefinition.name,
      systemId: this.systemId,
      time: Date.now(),
    })

    // Processing
    const result = mixinDefinition.mixin(this.world, {
      payload,
      mixin: createMixinRunner(this.world, this.systemId),
    })

    // Post processing event
    if (typeof (result as Promise<any>)?.then === 'function') {
      // Async case
      ;(result as Promise<any>).then(() =>
        this.world.bus.publish(ECS_SYSTEM_MIXIN_PROCESSED_EVENT, {
          name: mixinDefinition.name,
          systemId: this.systemId,
          time: Date.now(),
        }),
      )
    } else {
      // Sync case
      this.world.bus.publish(ECS_SYSTEM_MIXIN_PROCESSED_EVENT, {
        name: mixinDefinition.name,
        systemId: this.systemId,
        time: Date.now(),
      })
    }

    return result
  }
}

/**
 * Creates a mixin runner
 * @param world The ECS world instance
 * @param systemId The identifier of the system in which the mixin is executed
 */
export function createMixinRunner(world: EcsWorld, systemId: number) {
  const context = new SystemMixinRunner(world, systemId)
  return <TPayload>(mixinDefinition: ReturnType<typeof defineMixin<TPayload>>) =>
    (payload?: TPayload) =>
      context.run(mixinDefinition, payload! as any)
}
