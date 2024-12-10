import { Scheduler } from './scheduler';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';

/** Schedules execution each frame */
export class frame extends Scheduler<DOMHighResTimeStamp> implements Debuggable {
  readonly [DEBUG_NAME] = 'frame';
  readonly [DEBUG_TYPE] = '⚡';
  readonly [DEBUG_ID] = 'frame';
  get [DEBUG_DEPENDENCIES]() {
    return [];
  }

  /** @inheritdoc */
  public run(next: (payload: number) => unknown, dispose: () => void) {
    const handleFrame = (timestamp: DOMHighResTimeStamp) => {
      // Current frame
      const result = next(timestamp);

      // next frame
      if (result instanceof Promise) {
        result.then(() => {
          if (!this.disposed) {
            requestAnimationFrame(handleFrame);
          }
        });
      } else {
        if (!this.disposed) {
          requestAnimationFrame(handleFrame);
        }
      }
    };

    // Starting frames handling
    requestAnimationFrame(handleFrame);
  }
}
