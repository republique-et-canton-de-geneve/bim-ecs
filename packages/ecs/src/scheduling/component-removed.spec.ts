import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { componentRemoved } from './component-removed';
import { EcsComponent } from '../components';

describe('componentRemoved', () => {
  it('should trigger the bound system on component removal', () => {
    class Component1 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(defineSystem('foo', () => fooCount++, componentRemoved(Component1)))
      .run();

    const entity = world.entities.spawn(new Component1());
    world.entities.removeComponent(entity, Component1);
    world.stop();

    expect(fooCount).toBe(1);
  });

  it('should trigger the bound system only for entities matching the query', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem(
          'foo',
          () => fooCount++,
          componentRemoved(Component2, ({ without }) => [Component1, without(Component3)]),
        ),
      )
      .run();

    const matching = world.entities.spawn(new Component1(), new Component2());
    const excluded = world.entities.spawn(new Component1(), new Component2(), new Component3());
    const unrelated = world.entities.spawn(new Component2());

    world.entities.removeComponent(matching, Component2); // Matches the query
    world.entities.removeComponent(excluded, Component2); // Excluded by Component3
    world.entities.removeComponent(unrelated, Component2); // No Component1
    world.stop();

    expect(fooCount).toBe(1);
  });
});
