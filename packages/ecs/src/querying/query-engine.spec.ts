// noinspection DuplicatedCode

import { describe, it, expect } from 'vitest';
import { QueryEngine } from './query-engine';
import { EntityPool } from '../entities';
import { EventBus } from '../event-bus';
import { EcsComponent, EcsIndexedComponent, ECS_COMPONENT_LINK_REMOVED } from '../components';

describe('QueryEngine', () => {
  describe('execute', () => {
    it('should provide entities with matching components', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

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
      const query = new QueryEngine({ bus }, entities);

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
      const query = new QueryEngine({ bus }, entities);

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
      const query = new QueryEngine({ bus }, entities);

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
      const query = new QueryEngine({ bus }, entities);

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
      const query = new QueryEngine({ bus }, entities);

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

    it('should provide entities holding any component of an anyOf statement', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsComponent {}
      class Component3 extends EcsComponent {}

      const spawnedEntities = [
        entities.spawn(new Component1()), // 0
        entities.spawn(new Component1(), new Component2()), // 1
        entities.spawn(new Component3()), // 2
        entities.spawn(new Component2(), new Component3()), // 3
      ];

      const result = [...query.execute(({ anyOf }) => [anyOf(Component2, Component3)])];

      expect(result).toHaveLength(3);

      expect(result).not.includes(spawnedEntities[0]); // No component of the group
      expect(result).includes(spawnedEntities[1]);
      expect(result).includes(spawnedEntities[2]);
      expect(result).includes(spawnedEntities[3]);
    });

    it('should combine anyOf with inclusion and without statements', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsComponent {}
      class Component3 extends EcsComponent {}
      class Component4 extends EcsComponent {}

      const spawnedEntities = [
        entities.spawn(new Component1(), new Component2()), // 0
        entities.spawn(new Component1(), new Component3(), new Component4()), // 1
        entities.spawn(new Component1()), // 2
        entities.spawn(new Component2(), new Component3()), // 3
      ];

      const result = [
        ...query.execute(({ anyOf, without }) => [Component1, anyOf(Component2, Component3), without(Component4)]),
      ];

      expect(result).toHaveLength(1);

      expect(result).includes(spawnedEntities[0]);
      expect(result).not.includes(spawnedEntities[1]); // Excluded by component 4
      expect(result).not.includes(spawnedEntities[2]); // No component of the group
      expect(result).not.includes(spawnedEntities[3]); // No component 1
    });

    it('should match every anyOf group', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsComponent {}
      class Component3 extends EcsComponent {}
      class Component4 extends EcsComponent {}

      const spawnedEntities = [
        entities.spawn(new Component1(), new Component3()), // 0
        entities.spawn(new Component2(), new Component4()), // 1
        entities.spawn(new Component1(), new Component2()), // 2
        entities.spawn(new Component3()), // 3
      ];

      const result = [...query.execute(({ anyOf }) => [anyOf(Component1, Component2), anyOf(Component3, Component4)])];

      expect(result).toHaveLength(2);

      expect(result).includes(spawnedEntities[0]);
      expect(result).includes(spawnedEntities[1]);
      expect(result).not.includes(spawnedEntities[2]); // No component of the 2nd group
      expect(result).not.includes(spawnedEntities[3]); // No component of the 1st group
    });

    it('should combine anyOf with indexed values', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsIndexedComponent<string> {}
      class Component2 extends EcsComponent {}
      class Component3 extends EcsComponent {}

      const spawnedEntities = [
        entities.spawn(new Component1('foo')), // 0
        entities.spawn(new Component1('foo'), new Component2()), // 1
        entities.spawn(new Component1('bar'), new Component3()), // 2
        entities.spawn(new Component2()), // 3
      ];

      const result = [
        ...query.execute(({ withValue, anyOf }) => [withValue(Component1, 'foo'), anyOf(Component2, Component3)]),
      ];

      expect(result).toHaveLength(1);

      expect(result).not.includes(spawnedEntities[0]); // No component of the group
      expect(result).includes(spawnedEntities[1]);
      expect(result).not.includes(spawnedEntities[2]); // Wrong indexed value
      expect(result).not.includes(spawnedEntities[3]); // No indexed value
    });

    it('should throw when anyOf is used with no component type', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      // @ts-expect-error anyOf requires at least one component type
      expect(() => query.execute(({ anyOf }) => [anyOf()])).toThrow();
    });

    it('should execute archetype only plan', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsComponent<string> {}

      const spawnedEntities = [
        entities.spawn(new Component1()), // 0
        entities.spawn(new Component1(), new Component2('foo')), // 1
        entities.spawn(new Component2('foo'), new Component1()), // 2
        entities.spawn(new Component1(), new Component2('bar')), // 3
        entities.spawn(new Component2('foo')), // 4
      ];

      const result = [...query.execute(() => [Component1, Component2])];

      expect(result).toHaveLength(3);

      expect(result).not.includes(spawnedEntities[0]);
      expect(result).includes(spawnedEntities[1]);
      expect(result).includes(spawnedEntities[2]);
      expect(result).includes(spawnedEntities[3]);
      expect(result).not.includes(spawnedEntities[4]);
    });

    it('should select index only plan', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsIndexedComponent<number> {}
      class Component2 extends EcsIndexedComponent<string> {}

      const spawnedEntities = [
        entities.spawn(new Component1(0)), // 0
        entities.spawn(new Component1(5), new Component2('foo')), // 1
        entities.spawn(new Component2('foo'), new Component1(0)), // 2
        entities.spawn(new Component1(0), new Component2('bar')), // 3
        entities.spawn(new Component2('foo')), // 4
      ];

      const result = [...query.execute(({ withValue }) => [withValue(Component1, 0), withValue(Component2, 'foo')])];

      expect(result).toHaveLength(1);

      expect(result).not.includes(spawnedEntities[0]);
      expect(result).not.includes(spawnedEntities[1]);
      expect(result).includes(spawnedEntities[2]);
      expect(result).not.includes(spawnedEntities[3]);
      expect(result).not.includes(spawnedEntities[4]);
    });

    it('should execute query with mixed entities', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

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

    it('should execute query with lot of archetypes combinations', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsIndexedComponent<string> {}
      class Component3 extends EcsComponent {}
      class Component4 extends EcsComponent {}

      const spawnedEntities = [
        entities.spawn(new Component1(), new Component3(), new Component2('foo'), new Component4()), // 0
        entities.spawn(new Component3(), new Component1(), new Component2('foo')), // 1
        entities.spawn(new Component2('foo'), new Component4()), // 2
        entities.spawn(new Component3(), new Component2('bar')), // 3
        entities.spawn(new Component3(), new Component4()), // 4
      ];

      const result = [...query.execute(({ withValue }) => [Component1, withValue(Component2, 'foo')])];

      expect(result).toHaveLength(2);

      expect(result).includes(spawnedEntities[0]);
      expect(result).includes(spawnedEntities[1]);
      expect(result).not.includes(spawnedEntities[2]);
      expect(result).not.includes(spawnedEntities[3]);
      expect(result).not.includes(spawnedEntities[4]);
    });
  });

  describe('execute after mutations', () => {
    it('should reflect added components', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsComponent {}

      const entity = entities.spawn(new Component1());
      expect([...query.execute(() => [Component1, Component2])]).toHaveLength(0);

      entities.addComponent(entity, new Component2());

      expect([...query.execute(() => [Component1, Component2])]).toEqual([entity]);
    });

    it('should reflect removed components', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsComponent {}

      const entity = entities.spawn(new Component1(), new Component2());
      expect([...query.execute(() => [Component1, Component2])]).toEqual([entity]);

      entities.removeComponent(entity, Component2);

      expect([...query.execute(() => [Component1, Component2])]).toHaveLength(0);
      expect([...query.execute(() => [Component1])]).toEqual([entity]);
      expect([...query.execute(({ without }) => [Component1, without(Component2)])]).toEqual([entity]);
    });

    it('should not match an indexed value anymore once its component is removed', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component2 extends EcsIndexedComponent<string> {}

      const entity = entities.spawn(new Component2('foo'));
      expect([...query.execute(({ withValue }) => [withValue(Component2, 'foo')])]).toEqual([entity]);

      entities.removeComponent(entity, Component2);

      expect([...query.execute(({ withValue }) => [withValue(Component2, 'foo')])]).toHaveLength(0);
    });

    it('should provide no result for a value that was never indexed', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component2 extends EcsIndexedComponent<string> {}

      entities.spawn(new Component2('foo'));

      expect([...query.execute(({ withValue }) => [withValue(Component2, 'missing')])]).toHaveLength(0);
    });

    it('should reflect an indexed component value replacement', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component2 extends EcsIndexedComponent<string> {}

      const entity = entities.spawn(new Component2('foo'));

      entities.removeComponent(entity, Component2);
      entities.addComponent(entity, new Component2('bar'));

      expect([...query.execute(({ withValue }) => [withValue(Component2, 'foo')])]).toHaveLength(0);
      expect([...query.execute(({ withValue }) => [withValue(Component2, 'bar')])]).toEqual([entity]);
    });

    it('should keep the archetype while another component instance of the same type remains', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent<number> {}
      class Component2 extends EcsComponent {}

      const entity = entities.spawn(new Component1(0), new Component1(1), new Component2());

      // Cache handlers run before this subscriber: observes the intermediate state after each removal
      const observedMatches: boolean[] = [];
      bus.subscribe(ECS_COMPONENT_LINK_REMOVED, () => {
        observedMatches.push([...query.execute(() => [Component1, Component2])].includes(entity));
      });

      entities.removeComponent(entity, Component1); // Removes both instances, one event each

      expect(observedMatches).toEqual([true, false]); // Still matching after 1rst removal, excluded after the 2nd one
      expect([...query.execute(() => [Component2])]).toEqual([entity]);
    });
  });

  describe('executeOne', () => {
    it('should provide first match only', () => {
      const bus = new EventBus();
      const entities = new EntityPool({ bus });
      const query = new QueryEngine({ bus }, entities);

      class Component1 extends EcsComponent {}
      class Component2 extends EcsIndexedComponent<string> {}
      class Component3 extends EcsComponent {}
      class Component4 extends EcsComponent {}

      const spawnedEntities = [
        entities.spawn(new Component1(), new Component3(), new Component2('foo'), new Component4()), // 0
        entities.spawn(new Component3(), new Component1(), new Component2('foo')), // 1
        entities.spawn(new Component2('foo'), new Component4()), // 2
        entities.spawn(new Component3(), new Component2('bar')), // 3
        entities.spawn(new Component3(), new Component4()), // 4
      ];

      const result = query.executeOne(({ withValue }) => [Component1, withValue(Component2, 'foo')]);

      expect([spawnedEntities[0], spawnedEntities[1]]).toContain(result);
    });
  });
});
