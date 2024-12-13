import { describe, it, expect } from 'vitest';
import { Scheduler } from './scheduler';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';

describe('Scheduler', () => {
  describe('Scheduler for systems', () => {
    it('should stop iterating after being disposed', async () => {
      class Scheduler1 extends Scheduler<number> {
        run(next: (value: number) => void, dispose: () => void) {
          next(1);
          next(2);
          next(3);
          dispose();
        }
      }

      const results: any[] = [];
      const world = new EcsWorld();
      const system = defineSystem('foo', (_, { payload }) => results.push(payload), Scheduler1);

      world.systems.registerSystem(system);
      world.run();

      expect(results).toEqual([1, 2, 3]);
    });

    it('should stop iterating after being disposed', async () => {
      class Scheduler1 extends Scheduler<number> {
        async run(next: (value: number) => void, dispose: () => void) {
          next(1);
          next(2);
          dispose();
          await Promise.resolve();
          next(3);
        }
      }

      const results: any[] = [];
      const world = new EcsWorld();
      const system = defineSystem('foo', (_, { payload }) => results.push(payload), Scheduler1);

      world.systems.registerSystem(system);
      world.run();
      await new Promise((resolve) => setTimeout(resolve));

      expect(results).toEqual([1, 2]);
    });

    it('should set disposed state correctly', () => {
      const world = new EcsWorld();
      const disposableScheduler = new (class Scheduler1 extends Scheduler<number> {
        run() {}
      })(world, { systemId: 0 });

      expect(disposableScheduler.disposed).toBe(false);

      disposableScheduler[Symbol.dispose]();

      expect(disposableScheduler.disposed).toBe(true);
    });
  });
});
