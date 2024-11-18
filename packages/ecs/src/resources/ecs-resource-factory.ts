import { EcsWorld } from '../world'

export abstract class EcsResourceFactory<TResult> {
  constructor() {}
  public abstract build(world: EcsWorld): TResult
}
