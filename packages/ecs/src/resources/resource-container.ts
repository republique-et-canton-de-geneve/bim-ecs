import { EcsResource } from './ecs-resource'
import type { EcsResourceKey } from './ecs-resource-key'
import { EcsResourceFactory } from './ecs-resource-factory'
import { EcsWorld } from '../world'

/** ECS dependency injection */
export class ResourceContainer implements Disposable {
  readonly #refs = new Map<any, any>()

  constructor(private readonly world: EcsWorld) {}

  public resolve<TResult>(type: new (...args: any[]) => EcsResourceFactory<TResult>): TResult
  public resolve<TResult extends EcsResource>(type: new (...args: any[]) => TResult): TResult
  public resolve<TResult>(type: EcsResourceKey<TResult>): TResult

  /**
   * Resolves a resource instance from the given type. If the resource instance already exists in the container,
   * it returns the existing instance. Otherwise, it creates a new instance if the key is a valid resource constructor,
   * registers it, and returns the new instance.
   * @param key The resource instance constructor of resource key
   */
  public resolve(key: any): any {
    const existingRef = this.#refs.get(key)
    if (existingRef) {
      // Existing resource case
      return existingRef
    } else if (typeof key === 'function') {
      if (key.prototype instanceof EcsResource) {
        // New resource instance case
        const newRef = new key()
        this.#refs.set(key, newRef)
        return newRef
      } else if (key.prototype instanceof EcsResourceFactory) {
        const newRef = new key().build(this.world)
        this.#refs.set(key, newRef)
        return newRef
      }
    } else {
      // Not lazy creation compliant case
      throw new Error('Lazy resource creation is only supported for "Resource" children')
    }
  }

  // Resource instance override
  public register<T extends EcsResource>(value: T): ResourceContainer
  // General case override
  public register<T>(key: (new () => T) | EcsResourceKey<T>, value: T): ResourceContainer

  /**
   * Registers a pre-existing resource instance in the container with the specified key.
   * @param key The key
   * @param value The value instance
   */
  public register<T>(key: (new () => T) | EcsResourceKey<T> | EcsResource, value?: T) {
    if (value === undefined && key instanceof EcsResource) {
      this.#refs.set(key.constructor, key)
    }

    this.#refs.set(key, value)
    return this
  }

  /** Provides all refs */
  public getAll() {
    return [...this.#refs.entries()].map(([key, value]) => [key.name, value])
  }

  /** @inheritdoc */
  [Symbol.dispose]() {
    this.#refs.clear()
  }
}
