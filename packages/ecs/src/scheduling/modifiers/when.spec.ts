// noinspection DuplicatedCode

import { describe, it, expect } from 'vitest';
import { Scheduler } from '../scheduler';
import { EcsWorld } from '../../world';
import { when } from './when';
import { defineSystem } from '../../systems';

describe('when', () => {
  it('should not filter any item', async () => {
    const world = new EcsWorld();

    class Scheduler1 extends Scheduler<number> {
      run(next: (value: number) => void) {
        next(1);
        next(2);
        next(3);
      }
    }

    const results: any[] = [];
    const system = defineSystem(
      'foo',
      (_, { payload }) => results.push(payload),
      when(() => () => true, Scheduler1),
    );

    world.registerSystem(system);
    world.run();

    expect(results).toEqual([1, 2, 3]);
  });

  it('should filter last items', async () => {
    const world = new EcsWorld();

    let predicateResult = true;

    class Scheduler1 extends Scheduler<number> {
      run(next: (value: number) => void) {
        next(1);
        next(2);
        predicateResult = false;
        next(3);
      }
    }

    const results: any[] = [];
    const system = defineSystem(
      'foo',
      (_, { payload }) => results.push(payload),
      when(() => () => predicateResult, Scheduler1),
    );

    world.registerSystem(system);
    world.run();

    expect(results).toEqual([1, 2]);
  });
});
