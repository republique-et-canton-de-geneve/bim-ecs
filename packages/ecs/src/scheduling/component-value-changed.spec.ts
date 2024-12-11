import { describe, it, expect } from 'vitest';
import { EcsWorld } from '../world';
import { defineSystem } from '../systems';
import { spawned } from './entity-spawned';
import { EcsComponent, EcsMutableComponent } from '../components';
import { componentValueChanged } from './component-value-changed';

describe('componentValueChanged', () => {
  it('should trigger once component value has changed', () => {
    class Component1 extends EcsMutableComponent<string> {}

    let newValue: string | undefined = undefined;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem('foo', (_, { payload }) => (newValue = payload.newValue), componentValueChanged(Component1)),
      )
      .run();

    const component1 = new Component1('foo');
    world.entities.spawn(component1);
    new Promise((resolve) => setTimeout(resolve)); // awaits macrotask
    expect(newValue).toBeUndefined();
    component1.value = 'bar';
    new Promise((resolve) => setTimeout(resolve)); // awaits macrotask
    expect(newValue).toBe('bar');
    component1.value = 'baz';
    new Promise((resolve) => setTimeout(resolve)); // awaits macrotask
    world.stop();
    expect(newValue).toBe('baz');
  });

  it('should not detect changes when component has no association anymore', () => {
    class Component1 extends EcsMutableComponent<string> {}

    let newValue: string | undefined = undefined;
    const world = new EcsWorld()
      .registerSystem(
        defineSystem('foo', (_, { payload }) => (newValue = payload.newValue), componentValueChanged(Component1)),
      )
      .run();

    const component1 = new Component1('foo');
    const entity1 = world.entities.spawn(component1);
    component1.value = 'bar';
    new Promise((resolve) => setTimeout(resolve)); // awaits macrotask
    expect(newValue).toBe('bar');
    world.entities.remove(entity1);
    component1.value = 'baz';
    new Promise((resolve) => setTimeout(resolve)); // awaits macrotask
    expect(newValue).toBe('bar');

    world.stop();
  });
});
