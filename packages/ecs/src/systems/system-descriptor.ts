import type { SchedulerDescriptor } from '../scheduling/scheduler-descriptor';

/**
 * Plain, serializable and presentation-free description of a system.
 * It only carries facts: how to display them is up to the consumer (devtools, logs, tests...).
 */
export interface SystemDescriptor {
  /** The system identifier */
  id: number;
  /** The user-friendly label */
  name: string;
  /** Determines whether the system is currently running */
  running: boolean;
  /** Determines whether the system has been disposed (e.g. once a `startup` system has run) */
  disposed: boolean;
  /** The scheduler driving the system */
  scheduler: SchedulerDescriptor;
  /** What the system publishes / triggers once processed */
  then?: {
    /** The name of the published event */
    publish?: string;
    /** The name of the triggered command */
    trigger?: string;
  };
}
