import { EcsComponent } from './ecs-component';
import type { ComponentsTracker } from './components-tracker';

/**
 * Ecs mutable component base definition.
 * This component type handles value modifications
 * */
export abstract class EcsMutableComponent<T> extends EcsComponent<T> {
  #tracker: ComponentsTracker | null = null;

  /**
   * Updates the value of the component
   * @param newValue The new value
   */
  public set value(newValue: T) {
    if (newValue !== this._value) {
      const oldValue = this._value;
      this._value = newValue;
      this.#tracker?.notifyMutableComponentValueChanged(this, oldValue, newValue);
    }
  }

  /** @inheritDoc */
  public get value() {
    return super.value;
  }

  /**
   * Attaches the component instance to specified world
   * @param tracker The tracker the component is attached to
   */
  public attach(tracker: ComponentsTracker) {
    this.#tracker = tracker;
  }

  /** Detaches the component instance from attached tracker */
  public detach() {
    this.#tracker = null;
  }
}
