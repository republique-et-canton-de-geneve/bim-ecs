import { EcsWorld } from '../world';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED, type EntityId } from '../entities';
import {
  ECS_COMPONENT_LINK_ADDED,
  ECS_COMPONENT_LINK_REMOVED,
  ECS_MUTABLE_COMPONENT_VALUE_CHANGED,
} from './ecs-component-events';
import type { EcsComponent } from './ecs-component';
import { EcsMutableComponent } from './ecs-mutable-component';

/** Handles components life cycle tracking (when required) */
export class ComponentsTracker implements Disposable {
  #disposals = [] as Function[];

  private readonly trackedMutableComponents = new WeakMap<EcsMutableComponent<any>, Set<EntityId>>();

  constructor(private readonly world: Pick<EcsWorld, 'bus'>) {
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

  /**
   * Notifies the associated world instance a mutable component value has changed
   * @param component The mutated component
   * @param oldValue The value before it had changed
   * @param newValue The new value
   */
  public notifyMutableComponentValueChanged<TValue = any>(
    component: EcsMutableComponent<TValue>,
    oldValue: TValue,
    newValue: TValue,
  ) {
    const entities = this.trackedMutableComponents.get(component) ?? [];

    if (entities) {
      this.world.bus.publish(ECS_MUTABLE_COMPONENT_VALUE_CHANGED, {
        component,
        oldValue,
        newValue,
        entities,
      });
    } else {
      console.warn(
        'ECS: mutable component value changed event cannot be published. Undetected entities association',
        component,
      );
    }
  }

  private handleAddedEntity(entity: EntityId, components: Iterable<EcsComponent>) {
    for (const component of components) {
      // noinspection SuspiciousTypeOfGuard
      if (component instanceof EcsMutableComponent) {
        this.registerComponent(entity, component);
      }
    }
  }

  private handleRemovedEntity(entity: EntityId, components: Iterable<EcsComponent>) {
    for (const component of components) {
      // noinspection SuspiciousTypeOfGuard
      if (component instanceof EcsMutableComponent) {
        this.unregisterComponent(entity, component);
      }
    }
  }

  private handleComponentLinkAdded(entity: EntityId, component: EcsComponent) {
    // noinspection SuspiciousTypeOfGuard
    if (component instanceof EcsMutableComponent) {
      this.registerComponent(entity, component);
    }
  }

  private handleComponentLinkRemoved(entity: EntityId, component: EcsComponent) {
    // noinspection SuspiciousTypeOfGuard
    if (component instanceof EcsMutableComponent) {
      this.unregisterComponent(entity, component);
    }
  }

  private registerComponent(entity: EntityId, component: EcsMutableComponent<any>) {
    if (!this.trackedMutableComponents.has(component)) {
      this.trackedMutableComponents.set(component, new Set());
      component.attach(this);
    }

    this.trackedMutableComponents.get(component)!.add(entity);
  }

  private unregisterComponent(entity: EntityId, component: EcsMutableComponent<any>) {
    const entities = this.trackedMutableComponents.get(component);
    if (entities) {
      entities.delete(entity);
      if (entities.size === 0) {
        this.trackedMutableComponents.delete(component);
        component.detach();
      }
    }
  }

  [Symbol.dispose]() {
    this.#disposals.forEach((dispose) => dispose());
    this.#disposals.length = 0;
  }
}
