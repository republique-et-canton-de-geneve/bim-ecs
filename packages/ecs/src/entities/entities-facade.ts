import { EntityPool } from './entity-pool';
import { QueryEngine } from '../querying';
import { type EcsComponent, type EcsComponentCtor } from '../components';
import type { EntityId } from './entity-id';
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
