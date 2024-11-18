import type { EcsEvent } from '../event-bus'
import type { SchedulerCtorHost } from './scheduler-constructor'

/** Occurs when a scheduler is disposed */
export const SCHEDULER_DISPOSED_EVENT = Symbol('SCHEDULER_DISPOSED_EVENT') as EcsEvent<{
  /** The host associated to current scheduler instance */
  host: SchedulerCtorHost
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>
}>
