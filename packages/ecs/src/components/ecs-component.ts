/** ECS component base definition */
export abstract class EcsComponent<T = void> {
  /**
   * Creates a new component
   * @param _value The associated value (if any)
   */
  public constructor(protected _value: T) {}

  /** Gets the component associated value */
  public get value() {
    return this._value;
  }

  toString() {
    return this._value?.toString();
  }
}
