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
});
