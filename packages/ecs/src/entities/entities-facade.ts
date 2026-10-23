import { EntityPool } from './entity-pool';
import { QueryEngine } from '../querying';
import { type EcsComponent, type EcsComponentCtor } from '../components';
import type { EntityId } from './entity-id';
import type { EntityArchetype } from './entity-archetype';
import type { QueryDefinition } from '../querying/query-definition';

export class EntitiesFacade implements Partial<EntityPool> {
  constructor(
    public readonly pool: EntityPool,
    public readonly querying: QueryEngine,
  ) {}

  /** @inheritDoc */
  public spawn(...components: EcsComponent<any>[]) {
    return this.pool.spawn(...components);
  }

  /** @inheritDoc */
  public remove(entity: EntityId) {
    return this.pool.remove(entity);
  }

  /** @inheritDoc */
  public componentsOf(entityId: EntityId) {
    return this.pool.componentsOf(entityId);
  }

  /** Provides a component for specified entity */
  public componentOf<TComponent extends EcsComponent<any>>(
    entityId: EntityId,
    componentType: new (...args: any[]) => TComponent,
  ) {
    return this.pool.componentsOf(entityId).get(componentType);
  }

  /** @inheritDoc */
  public addComponent(entity: EntityId, ...components: EcsComponent<any>[]) {
    return this.pool.addComponent(entity, ...components);
  }

  /** @inheritDoc */
  public removeComponent(entity: EntityId, ...types: (typeof EcsComponent<any>)[]) {
    return this.pool.removeComponent(entity, ...types);
  }

  /**
   * Adds components to every entity matching the query
   * @param queryDefinition The query selecting the entities to mutate
   * @param componentsFactory Produces the component(s) to add for each matched entity
   * @returns The identifiers of the entities matched by the query
   */
  public addComponents(
    queryDefinition: QueryDefinition,
    componentsFactory: (entity: EntityId) => EcsComponent<any> | EcsComponent<any>[],
  ): EntityId[] {
    // The result is snapshot before mutating: mutations move entities across archetypes
    // and must not disturb the running query
    const entities = [...this.querying.execute(queryDefinition)];
    for (const entity of entities) {
      const components = componentsFactory(entity);
      if (Array.isArray(components)) {
        this.pool.addComponent(entity, ...components);
      } else {
        this.pool.addComponent(entity, components);
      }
    }

    return entities;
  }

  /**
   * Removes component types from every entity matching the query
   * @param queryDefinition The query selecting the entities to mutate
   * @param types The component types to remove
   * @returns The identifiers of the entities matched by the query
   */
  public removeComponents(queryDefinition: QueryDefinition, ...types: (typeof EcsComponent<any>)[]): EntityId[] {
    // The result is snapshot before mutating: mutations move entities across archetypes
    // and must not disturb the running query
    const entities = [...this.querying.execute(queryDefinition)];
    for (const entity of entities) {
      this.pool.removeComponent(entity, ...types);
    }

    return entities;
  }

  /**
   * Describes the entities archetypes for introspection purposes (cold path, never called while processing).
   * The cost is proportional to the number of archetypes, not to the number of entities.
   */
  public archetypes(): EntityArchetype[] {
    const archetypes: EntityArchetype[] = [];

    for (const entities of this.querying.archetypeCache.entitiesByArchetypeMask.values()) {
      // Archetypes are not removed once emptied: a representative entity is the way to detect them
      const representative = entities.values().next();
      if (representative.done) continue;

      const components = new Set<typeof EcsComponent<any>>();
      for (const component of this.pool.componentsByEntity.get(representative.value) ?? []) {
        components.add(component.constructor as typeof EcsComponent<any>);
      }

      archetypes.push({ components: [...components], entities });
    }

    return archetypes;
  }

  /**
   * Query entities from specified query definition
   * @param queryDefinition Query definition data
   */
  public query(queryDefinition: QueryDefinition) {
    return this.querying.execute(queryDefinition);
  }

  /**
   * Query first entity from specified query definition
   * @param queryDefinition Query definition data
   */
  public queryOne(queryDefinition: QueryDefinition) {
    return this.querying.executeOne(queryDefinition);
  }
}
