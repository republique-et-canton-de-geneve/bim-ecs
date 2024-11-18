import type { EcsWorld } from '../world'
import type { Scheduler } from './index'

export type SchedulerCtorSystemHost = { systemId: number }
export type SchedulerCtorSchedulerHost = Scheduler<any>
export type SchedulerCtorHost = SchedulerCtorSystemHost | SchedulerCtorSchedulerHost

export type SchedulerCtor<TPayload> = new (
  world: EcsWorld,
  host: SchedulerCtorHost,
) => Scheduler<TPayload>
