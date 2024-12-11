import { describe, it, expect, vi } from 'vitest';
import { EcsWorld } from '../world';
import { Scheduler } from '../scheduling';
import { defineSystem } from './define-system';

describe('defineSystem', () => {
  it('should run the system according to the scheduler', () => {
    const mockSystem = vi.fn();
    const mockScheduler = class extends Scheduler<number> {
      public run(next: (payload: number) => unknown, dispose: () => void): void {
        next(1);
        next(2);
        next(3);
        dispose();
      }
    };

    const world = new EcsWorld();

    // Define and run the system
    const fooSystem = defineSystem('foo', mockSystem, mockScheduler);
    fooSystem(world).run();

    // Verify that the system was called three times
    expect(mockSystem).toHaveBeenCalledTimes(3);
  });

  it('should pass the ECS world to the system function', () => {
    const mockSystem = vi.fn();

    const mockScheduler = class extends Scheduler<number> {
      public run(next: (payload: number) => unknown, dispose: () => void): void {
        next(1);
        dispose();
      }
    };

    const world = new EcsWorld();

    // Define and run the system
    const fooSystem = defineSystem('foo', mockSystem, mockScheduler);
    fooSystem(world).run();

    expect(mockSystem).toHaveBeenCalledWith(world, expect.anything());
  });
});
