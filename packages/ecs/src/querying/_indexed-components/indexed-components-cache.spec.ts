import { describe, it, expect } from 'vitest';
import { EventBus } from '../../event-bus';
import { IndexedComponentsCache } from './indexed-components-cache';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from '../../entities/entities-events';
import { EcsComponent, EcsIndexedComponent } from '../../components';
import { EntityPool } from '../../entities';
import { ECS_COMPONENT_LINK_REMOVED } from '../../components/ecs-component-events';

describe('indexedComponentsCache', () => {
  it('should add indexed components in cache. same values', () => {
    const bus = new EventBus();
    const indexedComponentsCache = new IndexedComponentsCache({ bus }, { componentsByEntity: new Map() });

    class Component1 extends EcsIndexedComponent<string> {}
    class Component2 extends EcsComponent {}

    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo'), new Component2()], entity: 1 });
    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()]).toHaveLength(1); // 1 component type / value
    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(2); // 2 entity associations
  });

  it('should add indexed components in cache. different values', () => {
    const bus = new EventBus();
    const indexedComponentsCache = new IndexedComponentsCache({ bus }, { componentsByEntity: new Map() });

    class Component1 extends EcsIndexedComponent<string> {}
    class Component2 extends EcsComponent {}

    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo'), new Component2()], entity: 1 });
    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('bar')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()]).toHaveLength(2); // 2 component type / value
    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(1); // 1 entity association
    expect([...indexedComponentsCache.entitiesByComponentValues.values()][1].size).toBe(1); // 1 entity association
  });

  it('should take into account removed entities', () => {
    const bus = new EventBus();
    const indexedComponentsCache = new IndexedComponentsCache({ bus }, { componentsByEntity: new Map() });

    class Component1 extends EcsIndexedComponent<string> {}
    class Component2 extends EcsComponent {}

    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo'), new Component2()], entity: 1 });
    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(2); // 2 entity associations

    bus.publish(ECS_ENTITY_REMOVED, { components: [new Component1('foo')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(1); // 1 entity associations last
  });

  it('should take into account removed components', () => {
    const bus = new EventBus();
    const entityPool = new EntityPool({ bus });
    const indexedComponentsCache = new IndexedComponentsCache({ bus }, entityPool);

    class Component1 extends EcsIndexedComponent<string> {}

    const entity = entityPool.spawn(new Component1('foo'));
    expect(indexedComponentsCache.entitiesByComponentValues.get([Component1, 'foo'])?.has(entity)).toBe(true);

    entityPool.removeComponent(entity, Component1);
    expect(indexedComponentsCache.entitiesByComponentValues.get([Component1, 'foo'])).toBeUndefined();
  });

  it('should index both values when an entity holds two instances of the same indexed component type', () => {
    const bus = new EventBus();
    const entityPool = new EntityPool({ bus });
    const indexedComponentsCache = new IndexedComponentsCache({ bus }, entityPool);

    class Component1 extends EcsIndexedComponent<string> {}

    const entity = entityPool.spawn(new Component1('foo'));
    entityPool.addComponent(entity, new Component1('bar'));

    expect(indexedComponentsCache.entitiesByComponentValues.get([Component1, 'foo'])?.has(entity)).toBe(true);
    expect(indexedComponentsCache.entitiesByComponentValues.get([Component1, 'bar'])?.has(entity)).toBe(true);
  });

  it('should keep the index entry while another instance with the same type and value remains', () => {
    const bus = new EventBus();
    const entityPool = new EntityPool({ bus });
    const indexedComponentsCache = new IndexedComponentsCache({ bus }, entityPool);

    class Component1 extends EcsIndexedComponent<string> {}

    const entity = entityPool.spawn(new Component1('foo'), new Component1('foo'));

    // Cache handlers run before this subscriber: observes the intermediate state after each removal
    const observedStates: (boolean | undefined)[] = [];
    bus.subscribe(ECS_COMPONENT_LINK_REMOVED, () => {
      observedStates.push(indexedComponentsCache.entitiesByComponentValues.get([Component1, 'foo'])?.has(entity));
    });

    entityPool.removeComponent(entity, Component1); // Removes both instances, one event each

    expect(observedStates).toEqual([true, undefined]); // Still indexed after 1rst removal, dropped after the 2nd one
    expect(indexedComponentsCache.entitiesByComponentValues.get([Component1, 'foo'])).toBeUndefined();
  });
});
