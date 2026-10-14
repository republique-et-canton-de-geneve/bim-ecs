import {
  ECS_SYSTEM_DISPOSED_EVENT,
  ECS_SYSTEM_REGISTERED_EVENT,
  ECS_WORLD_RUNNING_EVENT,
  ECS_WORLD_STOPPING_EVENT,
  type EcsEvent,
  type EcsWorld,
} from '@state-of-geneva/bim-ecs';
import type {
  ComponentsSnapshot,
  DevtoolsApi,
  EntitiesPage,
  EntitiesQuery,
  EntityDetail,
  ResourceDetail,
  ResourceInfo,
  SystemsSnapshot,
  WorldInfo,
  WorldState,
} from './protocol';
import { buildSystemsGraph } from './build-graph';
import { inspectComponents, inspectEntities, inspectEntity } from './inspect-entities';
import { serializeValue } from './serialize-value';

/**
 * Answers the questions of a devtools consumer about a world.
 *
 * Everything is computed on demand: while nobody asks, the only runtime cost is a revision counter bumped on the few
 * events altering the systems structure or state. Systems processing, entities and queries are never instrumented.
 */
export class DevtoolsBridge implements DevtoolsApi, Disposable {
  #revision = 0;
  readonly #unsubscribes: Array<() => void> = [];

  constructor(
    private readonly world: EcsWorld,
    public readonly id: string,
    public readonly name: string,
  ) {
    const bump = () => void this.#revision++;
    const watch = (event: EcsEvent<any>) => this.#unsubscribes.push(world.bus.subscribe(event, bump));

    watch(ECS_SYSTEM_REGISTERED_EVENT);
    watch(ECS_SYSTEM_DISPOSED_EVENT);
    watch(ECS_WORLD_RUNNING_EVENT);
    watch(ECS_WORLD_STOPPING_EVENT);
  }

  /** Identifies the world */
  public get worldInfo(): WorldInfo {
    return { id: this.id, name: this.name };
  }

  /** @inheritdoc */
  public info(): WorldState {
    let entities = 0;
    for (const archetype of this.world.entities.archetypes()) entities += archetype.entities.size;

    return {
      ...this.worldInfo,
      running: this.world.running,
      revision: this.#revision,
      systems: this.world.systems.size,
      entities,
    };
  }

  /** @inheritdoc */
  public systems(): SystemsSnapshot {
    return { revision: this.#revision, graph: buildSystemsGraph(this.world.systems.describe()) };
  }

  /** @inheritdoc */
  public components(): ComponentsSnapshot {
    return inspectComponents(this.world);
  }

  /** @inheritdoc */
  public entities(query?: EntitiesQuery): EntitiesPage {
    return inspectEntities(this.world, query);
  }

  /** @inheritdoc */
  public entity(id: number): EntityDetail | null {
    return inspectEntity(this.world, id);
  }

  /** @inheritdoc */
  public resources(): ResourceInfo[] {
    return this.world.container.list().map(({ name }, index) => ({ key: String(index), name }));
  }

  /** @inheritdoc */
  public resource(key: string): ResourceDetail | null {
    // Resources are only appended: indexes are stable keys
    const entry = this.world.container.list()[Number(key)];
    return entry ? { key, name: entry.name, value: serializeValue(entry.resource) } : null;
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.#unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
  }
}
