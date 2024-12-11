import { describe, expect, it } from 'vitest';
import { EcsWorld } from '../../world';
import { Scheduler } from '../scheduler';
import { compose } from './compose';
import { defineSystem } from '../../systems';

describe('Scheduler.compose', () => {
  it('should restore aggregation in proper order', async () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<number> {
      public async run(next: (payload: number) => unknown, dispose: () => void) {
        next(1);
        await new Promise((resolve) => setTimeout(resolve, 40));
        next(2);
        next(2.5);
        await new Promise((resolve) => setTimeout(resolve, 40));
        next(3);
        dispose();
      }
    }

    class Scheduler2 extends Scheduler<number> {
      public async run(next: (payload: number) => unknown, dispose: () => void) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        next(4);
        await new Promise((resolve) => setTimeout(resolve, 40));
        next(5);
        await new Promise((resolve) => setTimeout(resolve, 40));
        next(6);
        dispose();
      }
    }

    const results: any[] = [];
    const system = defineSystem('foo', (_, { payload }) => results.push(payload), compose(Scheduler1, Scheduler2));
    world.registerSystem(system);
    world.run();

    // Forces the composed scheduler to buffer next tick
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(results).toEqual([1, 4, 2, 2.5, 5, 3, 6]);
  });
});
