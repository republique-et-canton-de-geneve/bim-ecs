import { EcsWorld } from '../../world';
import { EcsComponent, EcsIndexedComponent } from '../../components';
import type { EntityId, EntityPool } from '../../entities';
import { TupleMap } from '@bim-ecs/tuple-collections';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from '../../entities/entities-events';
import { ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED } from '../../components/ecs-component-events';

/** Handles indexed components value caching */
export class IndexedComponentsCache implements Disposable {
  #disposals = [] as Function[];
  /** @internal Stripped from the .d.ts: its `TupleMap` type comes from an embedded (non-published) lib */
  public readonly entitiesByComponentValues = new TupleMap<[typeof EcsIndexedComponent<any>, any], Set<EntityId>>();

  constructor(
    world: Pick<EcsWorld, 'bus'>,
    private readonly entityPool: Pick<EntityPool, 'componentsByEntity'>,
  ) {
    this.#disposals.push(
      world.bus.subscribe(ECS_ENTITY_SPAWNED, ({ entity, components }) => this.handleAddedEntity(entity, components)),
    );
    this.#disposals.push(
      world.bus.subscribe(ECS_ENTITY_REMOVED, ({ entity, components }) => this.handleRemovedEntity(entity, components)),
    );
    this.#disposals.push(
      world.bus.subscribe(ECS_COMPONENT_LINK_ADDED, ({ entity, component }) =>
        this.handleComponentLinkAdded(entity, component),
      ),
    );
    this.#disposals.push(
      world.bus.subscribe(ECS_COMPONENT_LINK_REMOVED, ({ entity, component }) =>
        this.handleComponentLinkRemoved(entity, component),
      ),
    );
  }

  private handleAddedEntity(entity: EntityId, components: Iterable<EcsComponent>) {
    for (const component of components) {
      // noinspection SuspiciousTypeOfGuard
      if (!(component instanceof EcsIndexedComponent)) continue; // Not indexed component -> should not be registered in cache

      // Registering component value in cache
      const componentType = component.constructor as typeof EcsIndexedComponent<any>;
      const existingEntitySet = this.entitiesByComponentValues.get([componentType, component.value]);
      if (existingEntitySet) {
        existingEntitySet.add(entity);
      } else {
        this.entitiesByComponentValues.set([componentType, component.value], new Set<EntityId>([entity]));
      }
    }
  }

  private handleRemovedEntity(entity: EntityId, components: Iterable<EcsComponent>) {
    for (const component of components) {
      // noinspection SuspiciousTypeOfGuard
      if (!(component instanceof EcsIndexedComponent)) continue;

      const componentType = component.constructor as typeof EcsIndexedComponent<any>;
      const existingEntitySet = this.entitiesByComponentValues.get([componentType, component.value]);
      if (existingEntitySet) {
        existingEntitySet.delete(entity);
        if (existingEntitySet.size === 0) {
          this.entitiesByComponentValues.delete([componentType, component.value]);
        }
      }
    }
  }

  private handleComponentLinkAdded(entity: EntityId, component: EcsComponent) {
    // noinspection SuspiciousTypeOfGuard
    if (!(component instanceof EcsIndexedComponent)) return;

    const componentType = component.constructor as typeof EcsIndexedComponent<any>;
    const existingEntitySet = this.entitiesByComponentValues.get([componentType, component.value]);
    if (existingEntitySet) {
      existingEntitySet.add(entity);
    } else {
      this.entitiesByComponentValues.set([componentType, component.value], new Set<EntityId>([entity]));
    }
  }

  private handleComponentLinkRemoved(entity: EntityId, component: EcsComponent) {
    // noinspection SuspiciousTypeOfGuard
    if (!(component instanceof EcsIndexedComponent)) return;

    const componentType = component.constructor as typeof EcsIndexedComponent<any>;

    // Another component instance with the same type and value may remain on the entity: index unchanged
    for (const remaining of this.entityPool.componentsByEntity.get(entity) ?? []) {
      if (remaining.constructor === componentType && (remaining as EcsIndexedComponent<any>).value === component.value)
        return;
    }

    const existingEntitySet = this.entitiesByComponentValues.get([componentType, component.value]);
    if (existingEntitySet) {
      existingEntitySet.delete(entity);
      if (existingEntitySet.size === 0) {
        this.entitiesByComponentValues.delete([componentType, component.value]);
      }
    }
  }

  /** @inheritDoc */
  [Symbol.dispose]() {
    this.#disposals.forEach((dispose) => dispose());
    this.#disposals.length = 0;
  }
}
