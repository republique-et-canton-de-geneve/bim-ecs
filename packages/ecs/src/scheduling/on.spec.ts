import { describe, it, expect } from 'vitest';
import type { EcsEvent } from '../event-bus';
import { on } from './on';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';

describe('scheduler:on', () => {
  it('should produce a sequence of numbers on event trigger', () => {
    const world = new EcsWorld();
    const triggerEvent = Symbol('triggerEvent') as EcsEvent<number>;

    let results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), on(triggerEvent));
    world.registerSystem(system);
    world.run();

    expect(results).toHaveLength(0);
    world.bus.publish(triggerEvent, 1);
    expect(results).toEqual([1]);
    world.bus.publish(triggerEvent, 10);
    expect(results).toEqual([1, 10]);
  });

  it('should allow multiple subscribers for the same event', () => {
    const world = new EcsWorld();
    const triggerEvent = Symbol('triggerEvent') as EcsEvent<number>;

    let results1: any[] = [];
    let results2: any[] = [];
    const system1 = defineSystem('foo1', (_, { payload }) => results1.push(payload), on(triggerEvent));
    const system2 = defineSystem('foo2', (_, { payload }) => results2.push(payload), on(triggerEvent));
    world.registerSystem(system1);
    world.registerSystem(system2);
    world.run();

    expect(results1).toHaveLength(0);
    expect(results2).toHaveLength(0);
    world.bus.publish(triggerEvent, 1);
    expect(results1).toEqual([1]);
    expect(results2).toEqual([1]);
    world.bus.publish(triggerEvent, 10);
    expect(results1).toEqual([1, 10]);
    expect(results2).toEqual([1, 10]);
  });

  it('should allow multiple events subscriptions', () => {
    const world = new EcsWorld();
    const triggerEvent1 = Symbol('triggerEvent1') as EcsEvent<number>;
    const triggerEvent2 = Symbol('triggerEvent2') as EcsEvent<number>;

    let results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), on([triggerEvent1, triggerEvent2]));
    world.registerSystem(system);
    world.run();

    expect(results).toHaveLength(0);
    world.bus.publish(triggerEvent1, 1);
    expect(results).toEqual([1]);
    world.bus.publish(triggerEvent2, 10);
    expect(results).toEqual([1, 10]);
  });
});
