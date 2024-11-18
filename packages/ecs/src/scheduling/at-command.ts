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
    #resolveNext: ((value: TPayload) => void) | null = null;

    /** Pending event payloads */
    readonly #eventPayloadsQueue: TPayload[] = [];

    #unsubscribe: Function = this.world.bus.subscribe(ECS_COMMAND_EVENT, (args) => {
      if (args.command !== commandKey) return;
      if (this.#resolveNext) {
        // Executing immediately
        this.#resolveNext(args.payload);
        this.#resolveNext = null;
      } else {
        // Stacking data
        this.#eventPayloadsQueue.push(args.payload);
      }
    });

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
    getIteratorImplementation() {
      const setResolver = (resolver: (value: TPayload) => void) => {
        if (this.#eventPayloadsQueue.length) {
          // Available stacked data
          resolver(this.#eventPayloadsQueue.shift()!);
        } else {
          // Nothing stacked. Awaiting next data
          this.#resolveNext = resolver;
        }
      };

      return {
        /** @inheritdoc */
        next() {
          return new Promise<IteratorResult<TPayload>>((resolve) => {
            /** @inheritdoc */
            setResolver((value) => resolve({ value, done: false }));
          });
        },
      };
    }

    /** @inheritdoc */
    [Symbol.dispose]() {
      this.#unsubscribe();
      super[Symbol.dispose]();
    }
  };
}
