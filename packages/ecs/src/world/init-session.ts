import type { EntityId } from '../entities';

export class InitSession implements Disposable {
  #disposed = false;

  #spawnedEntities = new Set<EntityId>()

  constructor(private readonly dispose: () => void) {
  }

  public registerEntity(entity: EntityId){
    this.#spawnedEntities.add(entity);
  }

  public get spawnEntities() {
    return this.#spawnedEntities
  }

  [Symbol.dispose]() {
    if(!this.#disposed) {
      this.dispose()
    } else {
      console.warn('Init session already disposed')
    }
  }
}