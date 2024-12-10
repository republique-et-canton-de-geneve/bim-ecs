import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { spawned } from './entity-spawned';
import { EcsComponent } from '../components';

describe('spawned', () => {
  it('should trigger once the bound system', () => {
    class Component1 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem(
          'foo',
          () => fooCount++,
          spawned(() => [Component1]),
        ),
      )
      .run();

    world.entities.spawn(new Component1());
    world.stop();

    expect(fooCount).toBe(1);
  });

  it('should trigger 3 times the system', () => {
    class Component1 extends EcsComponent {}

    let fooCount = 0;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem(
          'foo',
          () => fooCount++,
          spawned(() => [Component1]),
        ),
      )
      .run();

    world.entities.spawn(new Component1());
    world.entities.spawn(new Component1());
    world.entities.spawn(new Component1());
    world.stop();

    expect(fooCount).toBe(3);
  });
});
