import { ArchetypeMaskMap } from './archetype-mask-map.ts';
import { EntityId } from '../../entities/entity-id.ts';
import { archetypeFromComponents, ArchetypeMask } from './archetype.ts';
import { archetypeMaskFor } from './archetype-mask-for.ts';
import { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter.ts';
import { EcsWorld } from '../../world';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from '../../entities/entities-events.ts';
import { ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED } from '../../components/ecs-component-events.ts';

export class ArchetypeCache implements Disposable {
  #disposals = [] as Function[];
  public readonly counter = new ComponentTypeIdFlagCounter();

  // Both content should be synchronized
  public readonly entitiesByArchetypeMask = new ArchetypeMaskMap<Set<EntityId>>();
  public readonly archetypeMaskByEntity = new Map<EntityId, ArchetypeMask>();

  constructor(private readonly world: Pick<EcsWorld, 'entities' | 'bus'>) {
    this.#disposals.push(world.bus.subscribe(ECS_ENTITY_SPAWNED, ({ entity }) => this.handleAddedEntity(entity)));
    this.#disposals.push(world.bus.subscribe(ECS_ENTITY_REMOVED, ({ entity }) => this.handleRemovedEntity(entity)));
    this.#disposals.push(world.bus.subscribe([ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED], ({ entity }) => this.handleModifiedEntity(entity)));
  }

  private handleAddedEntity(entityId: EntityId) {
    const archetype = archetypeFromComponents(this.world.entities.componentsByEntity.get(entityId) ?? []);
    const mask = archetypeMaskFor(archetype, this.counter);

    // entitiesByArchetypeMask registration
    const existingEntitySet = this.entitiesByArchetypeMask.get(mask);
    if (existingEntitySet) {
      existingEntitySet.add(entityId);
    } else {
      this.entitiesByArchetypeMask.set(mask, new Set<EntityId>([entityId]));
    }

    // archetypeMaskByEntity registration
    this.archetypeMaskByEntity.set(entityId, mask);
  }

  private handleRemovedEntity(entityId: EntityId) {
    const existingMaskAssociation = this.archetypeMaskByEntity.get(entityId);

    // Removing entity
    if (existingMaskAssociation) {
      // Removing entityId from entitiesByArchetypeMask
      const currentEntitySet = this.entitiesByArchetypeMask.get(existingMaskAssociation);
      currentEntitySet?.delete(entityId);

      // Removing entityId from archetypeMaskByEntity
      this.archetypeMaskByEntity.delete(entityId);
    }
  }

  private handleModifiedEntity(entityId: EntityId) {
    // Removing entity
    this.handleRemovedEntity(entityId);

    // Adding entity back
    this.handleAddedEntity(entityId);
  }

  [Symbol.dispose]() {
    this.#disposals.forEach((dispose) => dispose());
    this.#disposals.length = 0;
  }
}
