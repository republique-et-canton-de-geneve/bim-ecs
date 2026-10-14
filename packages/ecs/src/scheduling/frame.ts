import { Scheduler } from './scheduler';
import type { SchedulerDescriptor } from './scheduler-descriptor';

/** Schedules execution each frame */
export class frame extends Scheduler<DOMHighResTimeStamp> {
  /** @inheritdoc */
  public describe(): SchedulerDescriptor {
    return { kind: 'frame' };
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
