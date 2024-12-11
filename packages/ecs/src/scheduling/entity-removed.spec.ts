import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { EcsComponent } from '../components';
import { entityRemoved } from './entity-removed';

describe('entityRemoved', () => {
  it('should trigger once the bound system', () => {
    class Component1 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem(
          'foo',
          () => fooCount++,
          entityRemoved(() => [Component1]),
        ),
      )
      .run();

    const entity = world.entities.spawn(new Component1());
    world.entities.remove(entity);
    world.stop();

    expect(fooCount).toBe(1);
  });

  it('should not trigger the system', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem(
          'foo',
          () => fooCount++,
          entityRemoved(() => [Component1]),
        ),
      )
      .run();

    const e1 = world.entities.spawn(new Component1());
    const e2 = world.entities.spawn(new Component2());
    world.entities.remove(e2);
    world.stop();

    expect(fooCount).toBe(0);
  });
});
