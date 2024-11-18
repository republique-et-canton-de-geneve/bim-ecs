import { Scheduler } from './scheduler'
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug'

/** Schedules execution each frame */
export class frame extends Scheduler<number> implements Debuggable {
  readonly [DEBUG_NAME] = 'frame'
  readonly [DEBUG_TYPE] = '⚡'
  readonly [DEBUG_ID] = 'frame'
  get [DEBUG_DEPENDENCIES]() {
    return []
  }

  /** @inheritdoc */
  override getIteratorImplementation() {
    const iterator: AsyncIterator<number> = {
      next: async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        return { value: Date.now(), done: false }
      },
    }
    return iterator
  }
}
