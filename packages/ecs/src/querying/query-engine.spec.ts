// noinspection DuplicatedCode

import { describe, it, expect } from 'vitest';
import { QueryEngine } from './query-engine';
import { EntityPool } from '../entities/entity-pool';
import { EventBus } from '../event-bus';
import { EcsComponent, EcsIndexedComponent } from '../components';

describe('QueryEngine', () => {
  it('should provide entities with matching components', () => {
    const bus = new EventBus();
    const entities = new EntityPool({ bus });
    const query = new QueryEngine({ bus, entities });

    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}

    const spawnedEntities = [
      entities.spawn(new Component1()), // 0
      entities.spawn(new Component1(), new Component2()), // 1
      entities.spawn(new Component2(), new Component1()), // 2
      entities.spawn(new Component2()), // 3
    ];

    const result = [...query.execute(() => [Component1])];

    expect(result).toHaveLength(3);

    expect(result).includes(spawnedEntities[0]);
    expect(result).includes(spawnedEntities[1]);
    expect(result).includes(spawnedEntities[2]);
    expect(result).not.includes(spawnedEntities[3]); // No component 1 available on this entity
  });

  it('should provide entities with matching index values', () => {
    const bus = new EventBus();
    const entities = new EntityPool({ bus });
    const query = new QueryEngine({ bus, entities });

    class Component1 extends EcsComponent {}
    class Component2 extends EcsIndexedComponent<string> {}

    const spawnedEntities = [
      entities.spawn(new Component1()), // 0
      entities.spawn(new Component1(), new Component2('foo')), // 1
      entities.spawn(new Component2('foo'), new Component1()), // 2
      entities.spawn(new Component1(), new Component2('bar')), // 3
      entities.spawn(new Component2('foo')), // 4
    ];

    const result = [...query.execute(({ withValue }) => [Component1, withValue(Component2, 'foo')])];

    expect(result).toHaveLength(2);

    expect(result).not.includes(spawnedEntities[0]);
    expect(result).includes(spawnedEntities[1]);
    expect(result).includes(spawnedEntities[2]);
    expect(result).not.includes(spawnedEntities[3]);
    expect(result).not.includes(spawnedEntities[4]);
  });

  it('should provide entities with matching components using "with"', () => {
    const bus = new EventBus();
    const entities = new EntityPool({ bus });
    const query = new QueryEngine({ bus, entities });

    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}

    const spawnedEntities = [
      entities.spawn(new Component1()), // 0
      entities.spawn(new Component1(), new Component2()), // 1
      entities.spawn(new Component2(), new Component1()), // 2
      entities.spawn(new Component2()), // 3
    ];

    const result = [...query.execute(({ include }) => [include(Component1)])];

    expect(result).toHaveLength(3);

    expect(result).includes(spawnedEntities[0]);
    expect(result).includes(spawnedEntities[1]);
    expect(result).includes(spawnedEntities[2]);
    expect(result).not.includes(spawnedEntities[3]); // No component 1 available on this entity
  });

  it('should take into account removed entities', () => {
    const bus = new EventBus();
    const entities = new EntityPool({ bus });
    const query = new QueryEngine({ bus, entities });

    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}

    const spawnedEntities = [
      entities.spawn(new Component1()), // 0
      entities.spawn(new Component1(), new Component2()), // 1
      entities.spawn(new Component2(), new Component1()), // 2
      entities.spawn(new Component2()), // 3
    ];

    expect([...query.execute(() => [Component1])]).toHaveLength(3);

    entities.remove(spawnedEntities[1]);

    const result = [...query.execute(() => [Component1])];

    expect(result).toHaveLength(2);

    expect(result).includes(spawnedEntities[0]);
    expect(result).not.includes(spawnedEntities[1]); // Removed !
    expect(result).includes(spawnedEntities[2]);
    expect(result).not.includes(spawnedEntities[3]);
  });

  it('should exclude components specified in without statement', () => {
    const bus = new EventBus();
    const entities = new EntityPool({ bus });
    const query = new QueryEngine({ bus, entities });

    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    const spawnedEntities = [
      entities.spawn(new Component1()), // 0
      entities.spawn(new Component1(), new Component2()), // 1
      entities.spawn(new Component2(), new Component1(), new Component3()), // 2
      entities.spawn(new Component2()), // 3
    ];

    const result = [...query.execute(({ without }) => [Component1, without(Component3)])];

    expect(result).toHaveLength(2);

    expect(result).includes(spawnedEntities[0]);
    expect(result).includes(spawnedEntities[1]);
    expect(result).not.includes(spawnedEntities[2]);
    expect(result).not.includes(spawnedEntities[3]); // No component 1 available on this entity
  });

  it('should work with only excluded items', () => {
    const bus = new EventBus();
    const entities = new EntityPool({ bus });
    const query = new QueryEngine({ bus, entities });

    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    const spawnedEntities = [
      entities.spawn(new Component1()), // 0
      entities.spawn(new Component1(), new Component2()), // 1
      entities.spawn(new Component2(), new Component1(), new Component3()), // 2
      entities.spawn(new Component2()), // 3
    ];

    const result = [...query.execute(({ without }) => [without(Component3)])];

    expect(result).toHaveLength(3);

    expect(result).includes(spawnedEntities[0]);
    expect(result).includes(spawnedEntities[1]);
    expect(result).not.includes(spawnedEntities[2]);
    expect(result).includes(spawnedEntities[3]); // No component 1 available on this entity
  });
});
