/* eslint-disable no-fallthrough */
// noinspection FallThroughInSwitchStatementJS

import { EventBus } from '../event-bus';
import { ResourceContainer } from '../resources/resource-container';
import type { SystemDefinition } from '../systems';
import { EcsSystemsPool } from '../systems/ecs-systems-pool';
import {
  ECS_SYSTEM_DISPOSED_EVENT,
  ECS_SYSTEM_MIXIN_PROCESSED_EVENT,
  ECS_SYSTEM_MIXIN_PROCESSING_EVENT,
  ECS_SYSTEM_PROCESSED_EVENT,
  ECS_SYSTEM_PROCESSING_EVENT,
  ECS_SYSTEM_PROCESSING_FAILED_EVENT,
} from '../systems/system-events';
import { ECS_WORLD_DISPOSING_EVENT, ECS_WORLD_RUNNING_EVENT, ECS_WORLD_STOPPING_EVENT } from './world-events';
import { EcsResource } from '../resources';
import { EntityPool } from '../entities/entity-pool';
import { ECS_ENTITY_SPAWNED } from '../entities/entities-events';
import type { EcsPlugin } from './ecs-plugin';
import { DebugTracker } from '../debug/debug-tracker';
import { QueryEngine } from '../querying/query-engine';

/** ECS world handling the overall ECS life cycle */
export class EcsWorld implements Disposable {
  get running() {
    return this.systems.isRunning;
  }

  /** Events bus */
  public readonly bus = new EventBus();
  /** Dependency injection handler */
  public readonly container = new ResourceContainer(this);
  /** System pool */
  public readonly systems = new EcsSystemsPool(this);
  /** Entities pool */
  public readonly entities = new EntityPool(this);
  /** Query engine */
  public readonly query = new QueryEngine(this);
  /** Debug tracker */
  public readonly debug = new DebugTracker(this);

  constructor(resources?: EcsResource[], options?: { verbose?: 'info' | 'debug' | true }) {
    if (options?.verbose) this.verbose(options?.verbose);

    for (const resource of resources ?? []) {
      this.container.register(resource);
    }
  }

  /** Activates system execution */
  public run() {
    if (this.systems.isRunning) return this;

    this.bus.publish(ECS_WORLD_RUNNING_EVENT, { time: Date.now() });
    this.systems.run();

    return this;
  }

  /** Stops systems execution */
  public stop() {
    if (!this.systems.isRunning) return;

    this.bus.publish(ECS_WORLD_STOPPING_EVENT, { time: Date.now() });
    this.systems.stop();
  }

  /**
   * Adds a system definition to current world instance
   * @param systemDefinition The system definition instance to be added
   */
  public registerSystem(systemDefinition: SystemDefinition<any>) {
    this.systems.registerSystem(systemDefinition);
    return this;
  }

  /**
   * Registers a plugin
   * @param plugin The plugin to register
   */
  public use(plugin: EcsPlugin) {
    return plugin(this);
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.bus.publish(ECS_WORLD_DISPOSING_EVENT, { time: Date.now() });

    this.systems[Symbol.dispose]();
    this.bus[Symbol.dispose]();
    this.container[Symbol.dispose]();
    this.query[Symbol.dispose]();
    this.entities[Symbol.dispose]();
  }

  private verbose(type: 'info' | 'debug' | true) {
    switch (type) {
      case 'debug':
        this.bus.subscribe(ECS_SYSTEM_PROCESSING_EVENT, ({ id }) => {
          const system = this.systems.get(id);
          if (system?.options?.maxLogLevel === 'info') return;
          console.log(`%c[ECS] %c    System "${system?.label}" processing...`, '', 'color: #888');
        });

        this.bus.subscribe(ECS_SYSTEM_PROCESSED_EVENT, ({ id }) => {
          const system = this.systems.get(id);
          if (system?.options?.maxLogLevel === 'info') return;
          console.log(`%c[ECS] %c ...System "${system?.label}" processed`, '', 'color: #888');
        });

        this.bus.subscribe(ECS_SYSTEM_MIXIN_PROCESSING_EVENT, ({ systemId, name }) => {
          const system = this.systems.get(systemId);
          if (system?.options?.maxLogLevel === 'info') return;
          console.log(`%c[ECS] %c    Mixin "${system?.label} > ${name}" processing...`, '', 'color: #888');
        });

        this.bus.subscribe(ECS_SYSTEM_MIXIN_PROCESSED_EVENT, ({ systemId, name }) => {
          const system = this.systems.get(systemId);
          if (system?.options?.maxLogLevel === 'info') return;
          console.log(`%c[ECS] %c ...Mixin "${system?.label} > ${name}" processed`, '', 'color: #888');
        });

      case 'info':
      case true:
        this.bus.subscribe(ECS_SYSTEM_DISPOSED_EVENT, ({ id }) =>
          console.log(
            `%c[ECS] %c❌ System "${this.systems.get(id)?.label}" disposed`,
            'color: yellow;',
            'color: white; font-weight: bold;',
          ),
        );

        this.bus.subscribe(ECS_SYSTEM_PROCESSING_FAILED_EVENT, ({ id, error }) => {
          const system = this.systems.get(id);
          console.error(`%c[ECS] %c ...System "${system?.label}" failed with error:`, error, 'color: #888');
        });

        this.bus.subscribe(ECS_WORLD_RUNNING_EVENT, () =>
          console.log(`%c[ECS] %c🚀 ECS world running`, 'color: yellow;', 'color: white; font-weight: bold;'),
        );

        this.bus.subscribe(ECS_WORLD_STOPPING_EVENT, () =>
          console.log(`%c[ECS] %c⭕ ECS world stopping`, 'color: yellow;', 'color: white; font-weight: bold;'),
        );

        this.bus.subscribe(ECS_WORLD_DISPOSING_EVENT, () =>
          console.log(`%c[ECS] %c❌ ECS world disposing`, 'color: yellow;', 'color: white; font-weight: bold;'),
        );

        this.bus.subscribe(ECS_ENTITY_SPAWNED, ({ entity, components }) =>
          console.log(
            `%c[ECS] %c🚀 ECS entity spawned`,
            entity,
            components,
            'color: yellow;',
            'color: white; font-weight: bold;',
          ),
        );
        break;
    }
  }
}
