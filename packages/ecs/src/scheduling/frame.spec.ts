import { describe, it, expect, beforeEach, afterEach, vitest } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { frame } from './frame';

describe('scheduler:frame', () => {
  beforeEach(() => vitest.useFakeTimers({ toFake: ['requestAnimationFrame'] }));
  afterEach(() => vitest.clearAllMocks());

  it('should produce a sequence of numbers on each frame', () => {
    const world = new EcsWorld();

    let counter = 0;
    const system = defineSystem('foo', () => counter++, frame);
    world.registerSystem(system);
    world.run();

    expect(counter).toBe(0);
    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(1);
    vitest.advanceTimersToNextFrame();
    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(3);
  });

  it('should not flood system', async () => {
    const world = new EcsWorld();

    let counter = 0;
    const system = defineSystem(
      'foo',
      async () => {
        await Promise.resolve();
        counter++;
      },
      frame,
    );
    world.registerSystem(system);
    world.run();

    expect(counter).toBe(0);
    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(0);
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    expect(counter).toBe(1);
    vitest.advanceTimersToNextFrame();
    vitest.advanceTimersToNextFrame();
    expect(counter).toBe(1);
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
    expect(counter).toBe(2);
  });
});
