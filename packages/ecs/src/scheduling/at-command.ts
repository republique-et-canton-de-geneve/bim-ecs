import type { SchedulerCtor } from './scheduler-constructor';
import type { EcsCommand } from '../systems';
import { Scheduler } from './scheduler';
import { ECS_COMMAND_EVENT } from '../systems/commands/command-events';
import { DEBUG_DEPENDENCIES, DEBUG_ID, DEBUG_NAME, DEBUG_TYPE, type Debuggable } from '../debug';

/**
 * Schedules execution on specified command
 * @param commandKey The command on which execution is scheduled
 */
export function atCommand<TPayload>(commandKey: EcsCommand<TPayload>): SchedulerCtor<any> {
  return class extends Scheduler<TPayload> implements Debuggable {
    /** @inheritdoc */
    public run(next: (payload: TPayload) => void) {
      this.#unsubscribe = this.world.bus.subscribe(ECS_COMMAND_EVENT, (args) => {
        // Filtering
        if (args.command !== commandKey) return;

        // Processing next step
        next(args.payload);
      });
    }

    #unsubscribe: Function | undefined = undefined;

    get [DEBUG_NAME]() {
      return (commandKey as Symbol).description ?? '#no name';
    }
    readonly [DEBUG_TYPE] = '🕹';
    get [DEBUG_ID]() {
      return `onCommand_${(commandKey as Symbol).description}`;
    }
    get [DEBUG_DEPENDENCIES]() {
      return [];
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe?.();
      this.#unsubscribe = undefined;
      super[Symbol.dispose]();
    }
  };
}
