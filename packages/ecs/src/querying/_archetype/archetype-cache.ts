// noinspection DuplicatedCode

import { ArchetypeMaskMap } from './archetype-mask-map';
import { type EntityId, EntityPool } from '../../entities';
import { archetypeFromComponents, type ArchetypeMask } from './archetype';
import { archetypeMaskFor } from './archetype-mask-for';
import { archetypeMaskIncluded } from './archetype-mask-operations';
import { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter';
import { getComponentTypeId } from '../component-type-ids';
import { EcsWorld } from '../../world';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from '../../entities';
import { type EcsComponent, ECS_COMPONENT_LINK_ADDED, ECS_COMPONENT_LINK_REMOVED } from '../../components';

export class ArchetypeCache implements Disposable {
  #disposals = [] as Function[];
  public readonly counter = new ComponentTypeIdFlagCounter();

  // Both content should be synchronized
  public readonly entitiesByArchetypeMask = new ArchetypeMaskMap<Set<EntityId>>();
  public readonly archetypeMaskByEntity = new Map<EntityId, ArchetypeMask>();

  constructor(
    world: Pick<EcsWorld, 'bus'>,
    private readonly entityPool: EntityPool,
  ) {
    this.#disposals.push(world.bus.subscribe(ECS_ENTITY_SPAWNED, ({ entity }) => this.handleAddedEntity(entity)));
    this.#disposals.push(world.bus.subscribe(ECS_ENTITY_REMOVED, ({ entity }) => this.handleRemovedEntity(entity)));
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

  private handleAddedEntity(entityId: EntityId) {
    const archetype = archetypeFromComponents(this.entityPool.componentsByEntity.get(entityId) ?? []);
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
      currentEntitySet!.delete(entityId); // Should always be synchronized, `?.` would be a performance loss here

      // Removing entityId from archetypeMaskByEntity
      this.archetypeMaskByEntity.delete(entityId);
    }
  }

  private handleComponentLinkAdded(entityId: EntityId, component: EcsComponent<unknown>) {
    const existingMask = this.archetypeMaskByEntity.get(entityId);
    if (!existingMask) return;

    const componentId = getComponentTypeId(component.constructor as typeof EcsComponent<any>, this.counter);
    if (archetypeMaskIncluded(componentId, existingMask)) return; // Component type already part of the archetype

    // Incremental mask update: existing mask + added component type bits
    const mask = new Uint32Array(existingMask);
    for (let i = 0; i < mask.length; i++) mask[i] |= componentId[i];

    this.moveEntity(entityId, existingMask, mask);
  }

  private handleComponentLinkRemoved(entityId: EntityId, component: EcsComponent<unknown>) {
    const existingMask = this.archetypeMaskByEntity.get(entityId);
    if (!existingMask) return;

    const componentType = component.constructor;
    const componentId = getComponentTypeId(componentType as typeof EcsComponent<any>, this.counter);
    if (!archetypeMaskIncluded(componentId, existingMask)) return; // Component type already out of the archetype

    // Another component instance of the same type may remain on the entity: archetype unchanged
    for (const remaining of this.entityPool.componentsByEntity.get(entityId) ?? []) {
      if (remaining.constructor === componentType) return;
    }

    // Incremental mask update: existing mask - removed component type bits
    const mask = new Uint32Array(existingMask);
    for (let i = 0; i < mask.length; i++) mask[i] &= ~componentId[i];

    this.moveEntity(entityId, existingMask, mask);
  }

  /** Moves an entity from its current archetype to a new one */
  private moveEntity(entityId: EntityId, previousMask: ArchetypeMask, mask: ArchetypeMask) {
    // Removing entityId from entitiesByArchetypeMask
    this.entitiesByArchetypeMask.get(previousMask)!.delete(entityId); // Should always be synchronized, `?.` would be a performance loss here

    // --> entitiesByArchetypeMask registration
    const existingEntitySet = this.entitiesByArchetypeMask.get(mask);
    if (existingEntitySet) {
      existingEntitySet.add(entityId);
    } else {
      this.entitiesByArchetypeMask.set(mask, new Set<EntityId>([entityId]));
    }

    // --> archetypeMaskByEntity update
    this.archetypeMaskByEntity.set(entityId, mask);
  }

  [Symbol.dispose]() {
    this.#disposals.forEach((dispose) => dispose());
    this.#disposals.length = 0;
  }
}
