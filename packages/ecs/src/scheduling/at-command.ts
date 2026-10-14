import type { SchedulerCtor } from './scheduler-constructor';
import type { EcsCommand } from '../systems';
import { Scheduler } from './scheduler';
import { ECS_COMMAND_EVENT } from '../systems/commands/command-events';
import { keyName, type SchedulerDescriptor } from './scheduler-descriptor';

/**
 * Schedules execution on specified command
 * @param commandKey The command on which execution is scheduled
 */
export function atCommand<TPayload>(commandKey: EcsCommand<TPayload>): SchedulerCtor<any> {
  return class extends Scheduler<TPayload> {
    /** @inheritdoc */
    public describe(): SchedulerDescriptor {
      return { kind: 'at-command', labels: [keyName(commandKey)] };
    }

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

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe?.();
      this.#unsubscribe = undefined;
      super[Symbol.dispose]();
    }
  };
}
