import { describe, it, expect } from 'vitest';
import { EventBus } from '../../event-bus';
import { IndexedComponentsCache } from './indexed-components-cache';
import { ECS_ENTITY_REMOVED, ECS_ENTITY_SPAWNED } from '../../entities/entities-events';
import { EcsComponent, EcsIndexedComponent } from '../../components';

describe('indexedComponentsCache', () => {
  it('should add indexed components in cache. same values', () => {
    const bus = new EventBus();
    const indexedComponentsCache = new IndexedComponentsCache({ bus });

    class Component1 extends EcsIndexedComponent<string> {}
    class Component2 extends EcsComponent {}

    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo'), new Component2()], entity: 1 });
    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()]).toHaveLength(1); // 1 component type / value
    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(2); // 2 entity associations
  });

  it('should add indexed components in cache. different values', () => {
    const bus = new EventBus();
    const indexedComponentsCache = new IndexedComponentsCache({ bus });

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
    const indexedComponentsCache = new IndexedComponentsCache({ bus });

    class Component1 extends EcsIndexedComponent<string> {}
    class Component2 extends EcsComponent {}

    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo'), new Component2()], entity: 1 });
    bus.publish(ECS_ENTITY_SPAWNED, { components: [new Component1('foo')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(2); // 2 entity associations

    bus.publish(ECS_ENTITY_REMOVED, { components: [new Component1('foo')], entity: 2 });

    expect([...indexedComponentsCache.entitiesByComponentValues.values()][0].size).toBe(1); // 1 entity associations last
  });
});
