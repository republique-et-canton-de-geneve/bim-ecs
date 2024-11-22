import { EcsWorld } from '../../world';
import { EcsComponent, EcsIndexedComponent } from '../../components';
import { EntityId } from '../../entities';
import { TupleMap } from '@bim/tuple-collections';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from '../../entities/entities-events';
import { ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED } from '../../components/ecs-component-events';

/** Handles indexed components value caching */
export class IndexedComponentsCache implements Disposable {
  #disposals = [] as Function[];
  public readonly entitiesByComponentValues = new TupleMap<[typeof EcsIndexedComponent<any>, any], Set<EntityId>>();

  constructor(world: Pick<EcsWorld, 'bus'>) {
    this.#disposals.push(
      world.bus.subscribe(ECS_ENTITY_SPAWNED, ({ entity, components }) => this.handleAddedEntity(entity, components)),
    );
    this.#disposals.push(
      world.bus.subscribe(ECS_ENTITY_REMOVED, ({ entity, components }) => this.handleRemovedEntity(entity, components)),
    );
    this.#disposals.push(
      world.bus.subscribe([ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED], ({ entity, component }) =>
        this.handleModifiedEntity(entity, component),
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

  private handleModifiedEntity(entity: EntityId, component: EcsComponent) {
    // noinspection SuspiciousTypeOfGuard
    if (!(component instanceof EcsIndexedComponent)) return;

    const componentType = component.constructor as typeof EcsIndexedComponent<any>;

    // Remove the entity from the old value set
    for (const [key, entities] of this.entitiesByComponentValues.entries()) {
      if (key[0] === componentType && entities.has(entity)) {
        entities.delete(entity);
        if (entities.size === 0) {
          this.entitiesByComponentValues.delete(key);
        }
        break;
      }
    }

    // Add the entity to the new value set
    const existingEntitySet = this.entitiesByComponentValues.get([componentType, component.value]);
    if (existingEntitySet) {
      existingEntitySet.add(entity);
    } else {
      this.entitiesByComponentValues.set([componentType, component.value], new Set<EntityId>([entity]));
    }
  }

  /** @inheritDoc */
  [Symbol.dispose]() {
    this.#disposals.forEach((dispose) => dispose());
    this.#disposals.length = 0;
  }
}
