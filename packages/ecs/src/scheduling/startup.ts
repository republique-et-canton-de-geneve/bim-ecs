import { Scheduler } from './scheduler'
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug'

/** Schedules execution once at startup (system registration of world startup) */
export class startup extends Scheduler<number> implements Debuggable {
  readonly [DEBUG_NAME] = 'startup'
  readonly [DEBUG_TYPE] = '🔘'
  // readonly [DEBUG_TYPE] = '🚀'
  get [DEBUG_ID]() {
    return `startup`
  }
  get [DEBUG_DEPENDENCIES]() {
    return []
  }

  /** @inheritdoc */
  async *getIteratorImplementation() {
    yield Promise.resolve(Date.now())
  }
}
