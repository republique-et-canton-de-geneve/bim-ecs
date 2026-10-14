import { describe, expect, it } from 'vitest';
import { EcsResource } from './ecs-resource';
import { ResourceContainer } from './resource-container';
import type { EcsResourceKey } from './ecs-resource-key';
import { EcsWorld } from '../world';
import { EcsResourceFactory } from './ecs-resource-factory';

describe('ResourceContainer', () => {
  it('should create a new resource instance', () => {
    class MyResource extends EcsResource {
      foo = 'bar';
    }

    const result = new ResourceContainer({} as EcsWorld).resolve(MyResource);

    expect(result.foo).toBe('bar');
  });

  it('should reuse same instance at second resolution', () => {
    class MyResource extends EcsResource {
      foo = 'bar';
    }

    const container = new ResourceContainer({} as EcsWorld);
    const result1 = container.resolve(MyResource);
    const result2 = container.resolve(MyResource);

    expect(result1).toBe(result2);
  });

  it('should create a new resource instance with factory', () => {
    class MyResource extends EcsResourceFactory<{ foo: string }> {
      build() {
        return { foo: 'bar' };
      }
    }

    const result = new ResourceContainer({} as EcsWorld).resolve(MyResource);

    expect(result.foo).toBe('bar');
  });

  it('should reuse a already created resource instance with factory', () => {
    class MyResource extends EcsResourceFactory<{ foo: string }> {
      build() {
        return { foo: 'bar' };
      }
    }

    const resultContainer = new ResourceContainer({} as EcsWorld);

    const result1 = resultContainer.resolve(MyResource);
    const result2 = resultContainer.resolve(MyResource);

    expect(result1).toBe(result2);
  });

  it('should register scalar value', () => {
    const container = new ResourceContainer({} as EcsWorld);

    const key = Symbol() as EcsResourceKey<number>;
    container.register(key, 5);
    const result = container.resolve(key);

    expect(result).toBe(5);
  });

  it('should register any vectoriel value', () => {
    const container = new ResourceContainer({} as EcsWorld);

    const key = Symbol() as EcsResourceKey<{ foo: string }>;
    container.register(key, { foo: 'bar' });
    const result = container.resolve(key);

    expect(result.foo).toBe('bar');
  });

  it('should throw an error when attempting to lazily resolve a type which does not inherit resource', () => {
    const container = new ResourceContainer({} as EcsWorld);
    const key = Symbol() as EcsResourceKey<{ foo: string }>;
    expect(() => container.resolve(key)).toThrow();
  });

  describe('list', () => {
    it('should list resources with a readable name whatever the kind of key is', () => {
      class MyResource extends EcsResource {
        foo = 'bar';
      }

      const container = new ResourceContainer({} as EcsWorld);
      container.resolve(MyResource);
      container.register(Symbol('MY_VALUE') as EcsResourceKey<number>, 5);

      expect(container.list()).toEqual([
        { name: 'MyResource', resource: expect.any(MyResource) },
        { name: 'MY_VALUE', resource: 5 },
      ]);
    });

    it('should list a resource registered by instance once', () => {
      class MyResource extends EcsResource {}

      const container = new ResourceContainer({} as EcsWorld);
      const instance = new MyResource();
      container.register(instance);

      expect(container.list()).toEqual([{ name: 'MyResource', resource: instance }]);
    });
  });
});
