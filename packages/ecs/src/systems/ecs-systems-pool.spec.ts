import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import type { EcsEvent } from '../event-bus';
import { startup } from '../scheduling/startup';
import { on } from '../scheduling/on';
import { after } from '../scheduling/after';
import { timer } from '../scheduling/timer';
import { defineSystem } from './define-system';
import type { EcsCommand } from './commands';
import { ECS_SYSTEM_REGISTERED_EVENT } from './system-events';

describe('EcsSystemsPool', () => {
  const SOMETHING_HAPPENED = Symbol('SOMETHING_HAPPENED') as EcsEvent<number>;
  const DO_SOMETHING = Symbol('DO_SOMETHING') as EcsCommand<number>;

  describe('describe', () => {
    it('should describe registered systems with their scheduler and outputs', () => {
      const producer = defineSystem('producer', () => 1, startup, { then: { publish: SOMETHING_HAPPENED } });
      const consumer = defineSystem('consumer', () => 2, on(SOMETHING_HAPPENED), { then: { trigger: DO_SOMETHING } });
      const ticker = defineSystem('ticker', () => {}, timer(1000));

      const world = new EcsWorld().registerSystem(producer).registerSystem(consumer).registerSystem(ticker);

      expect(world.systems.describe()).toEqual([
        {
          id: expect.any(Number),
          name: 'producer',
          running: false,
          disposed: false,
          scheduler: { kind: 'startup' },
          then: { publish: 'SOMETHING_HAPPENED' },
        },
        {
          id: expect.any(Number),
          name: 'consumer',
          running: false,
          disposed: false,
          scheduler: { kind: 'on', labels: ['SOMETHING_HAPPENED'] },
          then: { trigger: 'DO_SOMETHING' },
        },
        {
          id: expect.any(Number),
          name: 'ticker',
          running: false,
          disposed: false,
          scheduler: { kind: 'timer', params: { delay: 1000 } },
        },
      ]);
    });

    it('should keep upstream systems of "after" whatever the registration order is', () => {
      const first = defineSystem('first', () => {}, startup);
      const second = defineSystem('second', () => {}, after(first));

      // Registering downstream system before its upstream
      const world = new EcsWorld().registerSystem(second).registerSystem(first);
      const [secondDescriptor, firstDescriptor] = world.systems.describe();

      expect(secondDescriptor.scheduler.systems).toEqual([firstDescriptor.id]);
    });

    it('should reflect running and disposed states', async () => {
      const system = defineSystem('once', () => {}, startup);
      const world = new EcsWorld().registerSystem(system);

      expect(world.systems.describe()[0]).toMatchObject({ running: false, disposed: false });

      world.run();
      expect(world.systems.describe()[0]).toMatchObject({ running: true, disposed: false });

      // startup systems are disposed (through a microtask) once they have run
      await Promise.resolve();
      expect(world.systems.describe()[0]).toMatchObject({ running: false, disposed: true });
    });
  });

  describe('size', () => {
    it('should count the registered systems', () => {
      const world = new EcsWorld();
      expect(world.systems.size).toBe(0);

      world.registerSystem(defineSystem('first', () => {}, startup));
      world.registerSystem(defineSystem('second', () => {}, startup));

      expect(world.systems.size).toBe(2);
    });
  });

  describe('registration', () => {
    it('should publish an event when a system is registered', () => {
      const world = new EcsWorld();
      const registered: number[] = [];
      world.bus.subscribe(ECS_SYSTEM_REGISTERED_EVENT, ({ id }) => registered.push(id));

      const system = defineSystem('foo', () => {}, startup);
      world.registerSystem(system);

      expect(registered).toEqual([world.systems.describe()[0].id]);
    });
  });
});
