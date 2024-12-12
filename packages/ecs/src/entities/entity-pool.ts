import type { EntityId } from './entity-id';
import type { EcsComponent, EcsComponentCtor } from '../components';
import { ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED } from '../components';
import { EcsWorld } from '../world';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from './entities-events';
import { map } from '@bim-ecs/iterable';
import type { Archetype } from '../querying/_archetype';
import { ComponentsTracker } from '../components/components-tracker';

/** Handles ECS entities life cycle */
export class EntityPool implements Disposable {
  #entityIdCounter = 0;

  public readonly componentsTracker;

  /** Entity / components association */
  public readonly componentsByEntity = new Map<EntityId, Set<EcsComponent<unknown>>>();

  constructor(private readonly world: Pick<EcsWorld, 'bus'>) {
    this.componentsTracker = new ComponentsTracker(this.world);
  }

  /**
   * Creates a new entity instance
   * @param components Associated components
   */
  public spawn(...components: EcsComponent<any>[]) {
    // Entity creation
    const entity = this.#entityIdCounter++;
    this.componentsByEntity.set(entity, new Set(components));

    // Event
    this.world.bus.publish(ECS_ENTITY_SPAWNED, { entity, components });

    // Returning created entity id
    return entity;
  }

  /**
   * Removes specified component
   * @param entity
   */
  public remove(entity: EntityId) {
    const components = this.componentsByEntity.get(entity);
    if (components) {
      this.componentsByEntity.delete(entity);

      // Event
      this.world.bus.publish(ECS_ENTITY_REMOVED, { entity, components });
    }
  }

  /**
   * Provides components for specified entity, or undefined if none have been found
   * @param entityId The identifier of the entity
   */
  public componentsOf(entityId: EntityId) {
    return new Map(
      map(
        this.componentsByEntity.get(entityId) ?? [],
        (component) => [component.constructor, component] as [typeof EcsComponent<any>, EcsComponent<any>],
      ),
    ) as {
      /**
       * Gets the component instance
       * @param componentType The component type
       */
      get<TComponent extends EcsComponent<TValue>, TValue>(
        componentType: EcsComponentCtor<TComponent, TValue>,
      ): TComponent | undefined;

      /**
       * Determines whether the entity contains the component from its type
       * @param componentType The component type
       */
      has(componentType: typeof EcsComponent<any>): boolean;

      /** Provides the enumeration of ecs component instances */
      values(): Iterable<EcsComponent<any>>;

      /** Provides the enumeration of ecs component types */
      keys(): Archetype;
    };
  }

  /**
   * Adds a component to specified entity
   * @param entity The entity identifier
   * @param components The components to add
   * @returns true if a component has been added, falsy otherwise
   */
  public addComponent(entity: EntityId, ...components: EcsComponent<any>[]) {
    const entityComponents = this.componentsByEntity.get(entity);
    if (entityComponents) {
      for (const component of components) {
        entityComponents.add(component);
        this.world.bus.publish(ECS_COMPONENT_LINK_ADDED, { entity, component });
        // TODO prevent components doublons
      }
      return true;
    }
  }

  /**
   * Removes the specified component from entity
   * @param entity The identifier of the entity
   * @param types The component types
   * @returns true if a component has been removed, falsy otherwise
   */
  public removeComponent(entity: EntityId, ...types: (typeof EcsComponent<any>)[]) {
    const components = this.componentsByEntity.get(entity);
    if (!components) return false;

    let removed = false;
    if (components) {
      for (const component of components) {
        if (types.includes(component.constructor as typeof EcsComponent<any>)) {
          components.delete(component);
          this.world.bus.publish(ECS_COMPONENT_LINK_REMOVED, { entity, component });
          removed = true;
        }
      }
    }

    return removed;
  }

  /** @inheritDoc */
  [Symbol.dispose]() {
    this.componentsTracker[Symbol.dispose]();
  }
}
