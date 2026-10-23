import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { componentAdded } from './component-added';
import { EcsComponent } from '../components';

describe('componentAdded', () => {
  it('should trigger the bound system on component addition', () => {
    class Component1 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(defineSystem('foo', () => fooCount++, componentAdded(Component1)))
      .run();

    const entity = world.entities.spawn();
    world.entities.addComponent(entity, new Component1());
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
          componentAdded(Component2, ({ without }) => [Component1, without(Component3)]),
        ),
      )
      .run();

    const matching = world.entities.spawn(new Component1());
    const excluded = world.entities.spawn(new Component1(), new Component3());
    const unrelated = world.entities.spawn(new Component3());

    world.entities.addComponent(matching, new Component2()); // Matches the query
    world.entities.addComponent(excluded, new Component2()); // Excluded by Component3
    world.entities.addComponent(unrelated, new Component2()); // No Component1
    world.stop();

    expect(fooCount).toBe(1);
  });
});
