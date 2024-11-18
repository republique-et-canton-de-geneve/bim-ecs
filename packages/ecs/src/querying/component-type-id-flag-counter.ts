const UINT32ARRAY_DEFAULT_SIZE = 16; // Allows 16 * 32 component archetypes

/** Create component type ids */
export class ComponentTypeIdFlagCounter {
  /** The current array index counter value */
  private componentTypesArrayIndexCounter = 0;

  /** The current ID mask value */
  private componentTypesIdsCounter = 0b1 >>> 0;

  /**
   * Constructor
   * @param size The UInt32Array size hosting component id masks values
   */
  constructor(public readonly size = UINT32ARRAY_DEFAULT_SIZE) {}

  /** Creates next id value */
  public next() {
    // Creates newId from current state
    const newId = new Uint32Array(this.size);
    newId[this.componentTypesArrayIndexCounter] = this.componentTypesIdsCounter;

    // Preparing state for next id creation
    if (this.componentTypesIdsCounter === 1 << 30) {
      /*
       * For some reason, (1 << 30) << 1 is negative (creates 1111111... value instead of ({0}*31)1).
       * So manually creating a threshold at 1 << 30 to use next array index values
       */
      this.componentTypesIdsCounter = 0b1 >>> 0;
      this.componentTypesArrayIndexCounter++;
    } else {
      this.componentTypesIdsCounter <<= 1;
    }

    // Rendering created id
    return newId;
  }
}
