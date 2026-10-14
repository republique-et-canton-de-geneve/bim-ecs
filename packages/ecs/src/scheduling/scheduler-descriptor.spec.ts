import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { EcsComponent, EcsMutableComponent } from '../components';
import { defineSystem, type EcsCommand } from '../systems';
import { SYSTEM_DEFINITION_ID_KEY } from '../systems/define-system';
import type { EcsEvent } from '../event-bus';
import { Scheduler } from './scheduler';
import type { SchedulerCtor } from './scheduler-constructor';
import { startup } from './startup';
import { frame } from './frame';
import { timer } from './timer';
import { on } from './on';
import { atCommand } from './at-command';
import { after } from './after';
import { spawned } from './entity-spawned';
import { entityRemoved } from './entity-removed';
import { componentAdded } from './component-added';
import { componentRemoved } from './component-removed';
import { componentValueChanged } from './component-value-changed';
import { when } from './modifiers/when';
import { debounce } from './modifiers/debounce';
import { debounceFrame } from './modifiers/debounce-frame';
import { compose } from './modifiers/compose';

/** Instantiates the scheduler (without running it) and describes it */
function describeScheduler(ctor: SchedulerCtor<any>) {
  return new ctor(new EcsWorld(), { systemId: 0 }).describe();
}

describe('Scheduler descriptors', () => {
  class Position extends EcsComponent<number> {}
  class Health extends EcsMutableComponent<number> {}
  class Frozen extends EcsComponent {}

  const SOMETHING_HAPPENED = Symbol('SOMETHING_HAPPENED') as EcsEvent<number>;
  const SOMETHING_ELSE_HAPPENED = Symbol('SOMETHING_ELSE_HAPPENED') as EcsEvent<number>;
  const DO_SOMETHING = Symbol('DO_SOMETHING') as EcsCommand<number>;

  it('should describe startup, frame and timer', () => {
    expect(describeScheduler(startup)).toEqual({ kind: 'startup' });
    expect(describeScheduler(frame)).toEqual({ kind: 'frame' });
    expect(describeScheduler(timer(250))).toEqual({ kind: 'timer', params: { delay: 250 } });
  });

  it('should describe event and command schedulers by name', () => {
    expect(describeScheduler(on(SOMETHING_HAPPENED))).toEqual({ kind: 'on', labels: ['SOMETHING_HAPPENED'] });
    expect(describeScheduler(on([SOMETHING_HAPPENED, SOMETHING_ELSE_HAPPENED]))).toEqual({
      kind: 'on',
      labels: ['SOMETHING_HAPPENED', 'SOMETHING_ELSE_HAPPENED'],
    });
    expect(describeScheduler(atCommand(DO_SOMETHING))).toEqual({ kind: 'at-command', labels: ['DO_SOMETHING'] });
  });

  it('should describe component schedulers by component type name', () => {
    expect(describeScheduler(componentAdded(Position))).toEqual({ kind: 'component-added', labels: ['Position'] });
    expect(describeScheduler(componentRemoved(Position))).toEqual({ kind: 'component-removed', labels: ['Position'] });
    expect(describeScheduler(componentValueChanged(Health))).toEqual({
      kind: 'component-value-changed',
      labels: ['Health'],
    });
  });

  it('should describe entity schedulers by the components of their query', () => {
    expect(describeScheduler(spawned(({ without }) => [Position, without(Frozen)]))).toEqual({
      kind: 'entity-spawned',
      labels: ['Position'],
      without: ['Frozen'],
    });
    expect(describeScheduler(entityRemoved(() => [Position, Health]))).toEqual({
      kind: 'entity-removed',
      labels: ['Position', 'Health'],
    });
  });

  it('should describe upstream systems by identifier', () => {
    const first = defineSystem('first', () => {}, startup);
    const second = defineSystem('second', () => {}, startup);
    const idOf = (system: unknown) => (system as Record<symbol, number>)[SYSTEM_DEFINITION_ID_KEY];

    expect(describeScheduler(after(first))).toEqual({
      kind: 'after',
      systems: [idOf(first)],
      params: { combination: 'or' },
    });
    expect(describeScheduler(after([first, second], { combination: 'and' }))).toEqual({
      kind: 'after',
      systems: [idOf(first), idOf(second)],
      params: { combination: 'and' },
    });
  });

  it('should describe modifiers with the scheduler they wrap', () => {
    const isEven = () => (data: { payload: number }) => data.payload % 2 === 0;

    expect(describeScheduler(when(isEven, on(SOMETHING_HAPPENED)))).toEqual({
      kind: 'when',
      params: { predicate: 'isEven' },
      children: [{ kind: 'on', labels: ['SOMETHING_HAPPENED'] }],
    });
    expect(describeScheduler(debounce(frame, 100))).toEqual({
      kind: 'debounce',
      params: { delay: 100 },
      children: [{ kind: 'frame' }],
    });
    expect(describeScheduler(debounceFrame(on(SOMETHING_HAPPENED)))).toEqual({
      kind: 'debounce-frame',
      children: [{ kind: 'on', labels: ['SOMETHING_HAPPENED'] }],
    });
    expect(describeScheduler(compose(startup, timer(10)))).toEqual({
      kind: 'compose',
      children: [{ kind: 'startup' }, { kind: 'timer', params: { delay: 10 } }],
    });
  });

  it('should name anonymous conditions instead of merging them', () => {
    const descriptor = describeScheduler(when(() => () => true, startup));

    expect(descriptor.params).toEqual({ predicate: '#anonymous condition' });
  });

  it('should keep custom schedulers visible', () => {
    class MyCustomScheduler extends Scheduler<number> {
      run() {}
    }

    expect(describeScheduler(MyCustomScheduler)).toEqual({ kind: 'custom', labels: ['MyCustomScheduler'] });
  });
});
