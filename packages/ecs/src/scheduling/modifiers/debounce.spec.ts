import { describe, it, expect } from 'vitest';
import { Scheduler } from '../scheduler';
import { debounce } from './debounce';
import { EcsWorld } from '../../world';
import { defineSystem } from '../../systems';

describe('debounce', () => {
  it('should not debounce any item', async () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<number> {
      public async run(next: (payload: number) => unknown, dispose: () => void) {
        next(1);
        await new Promise((resolve) => setTimeout(resolve, 100));
        next(2);
        await new Promise((resolve) => setTimeout(resolve, 100));
        next(3);
        dispose();
      }
    }

    const results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), debounce(Scheduler1, 50));
    world.registerSystem(system);
    world.run();

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(results).toEqual([1, 2, 3]);
  });

  it('should debounce 2 items', async () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<number> {
      public async run(next: (payload: number) => unknown, dispose: () => void) {
        next(1);
        await new Promise((resolve) => setTimeout(resolve, 50));
        next(2);
        await new Promise((resolve) => setTimeout(resolve, 200));
        next(3);
        await new Promise((resolve) => setTimeout(resolve, 200));
        dispose();
      }
    }

    const results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), debounce(Scheduler1, 100));
    world.registerSystem(system);
    world.run();

    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(results).toEqual([2, 3]);
  });

  it('should interrupt scheduling after disposal', async () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<number> {
      public async run(next: (payload: number) => unknown, dispose: () => void) {
        next(1);
        await new Promise((resolve) => setTimeout(resolve, 100));
        next(2);
        await new Promise((resolve) => setTimeout(resolve, 100));
        next(3);
        await new Promise((resolve) => setTimeout(resolve, 100));
        dispose();
      }
    }

    const results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), debounce(Scheduler1, 100));
    world.registerSystem(system);
    world.run();
    await new Promise((resolve) => setTimeout(resolve, 250));
    world[Symbol.dispose]();
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(results).toEqual([1, 2]);
  });
});
