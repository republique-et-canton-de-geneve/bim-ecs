import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { startup } from './startup';

describe('startup', () => {
  it('should process the system at startup', () => {
    const world = new EcsWorld();

    let counter = 0;
    const startupSystem = defineSystem('foo', () => counter++, startup);
    world.registerSystem(startupSystem);

    expect(counter).toBe(0);
    world.run();
    expect(counter).toBe(1);
  });

  it('should process multiple systems at startup', () => {
    const world = new EcsWorld();

    let counter = 0;
    const startupSystem1 = defineSystem('foo1', () => counter++, startup);
    const startupSystem2 = defineSystem('foo2', () => counter++, startup);
    world.registerSystem(startupSystem1);
    world.registerSystem(startupSystem2);

    expect(counter).toBe(0);
    world.run();
    expect(counter).toBe(2);
  });
});
