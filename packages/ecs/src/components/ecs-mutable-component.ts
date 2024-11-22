import { EcsComponent } from './ecs-component';

/**
 * Ecs mutable component base definition.
 * This component type handles value modifications
 * */
export abstract class EcsMutableComponent<T> extends EcsComponent<T> {
  /**
   * Updates the value of the component
   * @param newValue The new value
   */
  public set(newValue: T) {
    this._value = newValue;
  }
}
