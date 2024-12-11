import { type SystemRunner } from './system-runner';
import { EcsWorld } from '../world';
import type { SystemDefinition } from './system-definition';
import type { EcsCommand } from './commands';
import { ECS_COMMAND_EVENT } from './commands/command-events';

/** Handles system pool running state */
export class EcsSystemsPool implements Disposable {
  #isRunning = false;

  /** Determines whether the systems are running */
  get isRunning() {
    return this.#isRunning;
  }

  constructor(private readonly world: EcsWorld) {}

  readonly #systems = new Map<number, SystemRunner<any>>();

  /**
   * Registers specified system
   * @param systemDefinition The system definition to be registered
   */
  public registerSystem(systemDefinition: SystemDefinition<any>) {
    const definition = systemDefinition(this.world);
    this.#systems.set(definition.id, definition);
  }

  /**
   * Triggers a command with associated payload
   * @param command The command to trigger
   * @param payload The payload
   */
  public triggerCommand<TPayload>(command: EcsCommand<TPayload>, payload?: TPayload) {
    this.world.bus.publish(ECS_COMMAND_EVENT, { command, payload });
  }

  /**
   * Gets the system definition instance from specified id
   * @param id THe system identifier
   */
  public get(id: number) {
    return this.#systems.get(id);
  }

  /** Runs registered systems */
  public run() {
    if (this.#isRunning) return;

    this.#isRunning = true;
    this.#systems.forEach((system) => system.run());
  }

  /** Interrupts registered systems */
  public stop() {
    if (!this.#isRunning) return;

    this.#isRunning = false;
    this.#systems.forEach((system) => system.stop());
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.#systems.forEach((system) => system[Symbol.dispose]());
  }
  //
  // /**
  //  * Provides a mixin runner
  //  * @param mixinDefinition The mixin definition
  //  */
  // public mixin<TPayload>(mixinDefinition: ReturnType<typeof defineSystemMixin<TPayload>>) {
  //   return (payload: TPayload) => mixinDefinition.mixin(this.world, { payload })
  // }
}
