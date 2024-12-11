import { describe, it, expect } from 'vitest';
import type { EcsEvent } from '../event-bus';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { atCommand } from './at-command';

describe('scheduler:atCommand', () => {
  it('should produce a sequence of numbers on command trigger', () => {
    const world = new EcsWorld();
    const command = Symbol('command') as EcsEvent<number>;

    let results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), atCommand(command));
    world.registerSystem(system);
    world.run();

    expect(results).toHaveLength(0);
    world.systems.triggerCommand(command, 1);
    expect(results).toEqual([1]);
    world.systems.triggerCommand(command, 10);
    expect(results).toEqual([1, 10]);
  });

  it('should allow multiple subscribers for the same command', () => {
    const world = new EcsWorld();
    const command = Symbol('command') as EcsEvent<number>;

    let results1: any[] = [];
    let results2: any[] = [];
    const system1 = defineSystem('foo1', (_, { payload }) => results1.push(payload), atCommand(command));
    const system2 = defineSystem('foo2', (_, { payload }) => results2.push(payload), atCommand(command));
    world.registerSystem(system1);
    world.registerSystem(system2);
    world.run();

    expect(results1).toHaveLength(0);
    expect(results2).toHaveLength(0);
    world.systems.triggerCommand(command, 1);
    expect(results1).toEqual([1]);
    expect(results2).toEqual([1]);
    world.systems.triggerCommand(command, 10);
    expect(results1).toEqual([1, 10]);
    expect(results2).toEqual([1, 10]);
  });
});
