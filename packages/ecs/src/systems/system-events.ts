import type { EcsEvent } from '../event-bus';
import type { SystemRunner } from './system-runner';

/** Occurs when a system is being invoked */
export const ECS_SYSTEM_PROCESSING_EVENT = Symbol('SYSTEM_PROCESSING_EVENT') as EcsEvent<{
  /** The system definition identifier */
  id: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
  /** Identifier to correlate events during system processing session */
  correlationId: number;
}>;

/** Occurs when a system invocation completed with failure */
export const ECS_SYSTEM_PROCESSING_FAILED_EVENT = Symbol('ECS_SYSTEM_PROCESSING_FAILED_EVENT') as EcsEvent<{
  /** The system definition identifier */
  id: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
  /** The error */
  error: any;
  /** Identifier to correlate events during system processing session */
  correlationId: number;
}>;

/** Occurs when a system invocation completed */
export const ECS_SYSTEM_PROCESSED_EVENT = Symbol('SYSTEM_PROCESSED_EVENT') as EcsEvent<{
  /** The system definition identifier */
  id: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
  /** The return value of the system */
  returnValue: any;
  /** Identifier to correlate events during system processing session */
  correlationId: number;
}>;

/** Occurs when a system invocation has ended (including failures) */
export const ECS_SYSTEM_PROCESS_ENDED_EVENT = Symbol('ECS_SYSTEM_PROCESS_END_EVENT') as EcsEvent<{
  /** The system definition identifier */
  id: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
  /** Identifier to correlate events during system processing session */
  correlationId: number;
}>;

/** Occurs when a system is disposed */
export const ECS_SYSTEM_DISPOSED_EVENT = Symbol('SYSTEM_DISPOSED_EVENT') as EcsEvent<{
  /** The system definition identifier */
  id: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
}>;

/** Occurs when a system is being invoked */
export const ECS_SYSTEM_MIXIN_PROCESSING_EVENT = Symbol('SYSTEM_MIXIN_PROCESSING_EVENT') as EcsEvent<{
  /** The name of the mixin */
  name: string;
  /** The system definition identifier */
  systemId: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
}>;

/** Occurs when a system invocation completed */
export const ECS_SYSTEM_MIXIN_PROCESSED_EVENT = Symbol('SYSTEM_MIXIN_PROCESSED_EVENT') as EcsEvent<{
  /** The name of the mixin */
  name: string;
  /** The system definition identifier */
  systemId: SystemRunner<unknown>['id'];
  /** The event timestamp */
  time: ReturnType<(typeof Date)['now']>;
}>;
