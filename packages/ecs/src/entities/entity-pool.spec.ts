import { describe, it, expect } from 'vitest';
import { EventBus } from '../event-bus';
import { EntityPool } from './entity-pool';
import { EcsComponent } from '../components';

describe('EntityPool', () => {
  it('should create an entity with specified component', () => {
    const bus = new EventBus();
    const entityPool = new EntityPool({ bus });

    class Component1 extends EcsComponent<string> {}

    const id1 = entityPool.spawn(new Component1('foo'));

    const resultingComponents = [...entityPool.componentsOf(id1)!.values()];

    expect(resultingComponents).toHaveLength(1);
    expect(resultingComponents[0].value).toBe('foo');
  });

  it('should create an entity with 2 components and 1 component', () => {
    const bus = new EventBus();
    const entityPool = new EntityPool({ bus });

    class Component1 extends EcsComponent<string> {}
    class Component2 extends EcsComponent<string> {}

    const id1 = entityPool.spawn(new Component1('foo'), new Component2('bar'));
    const id2 = entityPool.spawn(new Component1('baz'));

    {
      const resultingComponents = [...entityPool.componentsOf(id1)!.values()];

      expect(resultingComponents).toHaveLength(2);
      const values = resultingComponents.map((component) => component.value as string);
      expect(values).includes('foo');
      expect(values).includes('bar');
    }

    {
      const resultingComponents = [...entityPool.componentsOf(id2)!.values()];

      expect(resultingComponents).toHaveLength(1);
      const values = resultingComponents.map((component) => component.value as string);
      expect(values).toEqual(['baz']);
    }
  });
});
