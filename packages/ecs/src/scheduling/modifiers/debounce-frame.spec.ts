import { describe, it, expect, beforeEach, afterEach, vitest } from 'vitest';
import { EcsWorld } from '../../world';
import { defineSystem } from '../../systems';
import { debounceFrame } from './debounce-frame';
import { Scheduler } from '../scheduler';

describe('scheduler:debounceFrame', () => {
  beforeEach(() => vitest.useFakeTimers({ toFake: ['requestAnimationFrame'] }));
  afterEach(() => vitest.clearAllMocks());

  it('should execute only once per frame despite multiple invocations', () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<void> {
      public run(next: (payload: void) => unknown, dispose: () => void) {
        next();
        next();
        next();
        dispose();
      }
    }

    let counter = 0;
    const system = defineSystem('foo', () => counter++, debounceFrame(Scheduler1));
    world.registerSystem(system);
    world.run();

    expect(counter).toBe(0);
    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(1);

    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(1);
  });

  it('should not execute anything if inner scheduler doesn t send anything', () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<void> {
      public run() {}
    }

    let counter = 0;
    const system = defineSystem('foo', () => counter++, debounceFrame(Scheduler1));
    world.registerSystem(system);
    world.run();

    expect(counter).toBe(0);
    vitest.advanceTimersToNextFrame();

    expect(counter).toBe(0);

    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(0);
  });

  it('should dispose properly and stop execution', () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<void> {
      public run(next: (payload: void) => unknown, dispose: () => void) {
        next();
        next();
        next();
        dispose();
      }
    }

    let counter = 0;
    const system = defineSystem('foo', () => counter++, debounceFrame(Scheduler1));
    world.registerSystem(system);
    world.run();

    expect(counter).toBe(0);
    world[Symbol.dispose]();
    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(0); // No new execution after dispose
  });
});
