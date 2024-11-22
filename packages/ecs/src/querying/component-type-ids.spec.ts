import { describe, it, expect } from 'vitest';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter';

describe('ComponentTypeIdFlagCounter', () => {
  it('should create the next id correctly', () => {
    const counter = new ComponentTypeIdFlagCounter();

    // First ID
    const id1 = counter.next();
    expect(id1).toBeInstanceOf(Uint32Array);
    expect(id1.length).toBe(counter.size);
    expect(id1[0]).toBe(1); // 0b1
    expect(id1[1]).toBe(0); // Other indices should remain 0

    // Second ID
    const id2 = counter.next();
    expect(id2[0]).toBe(2); // 0b10

    // Third ID
    const id3 = counter.next();
    expect(id3[0]).toBe(4); // 0b100
  });

  it('should increment componentTypesArrayIndexCounter when counter overflows', () => {
    const counter = new ComponentTypeIdFlagCounter();

    // Generate enough IDs to overflow the current 32-bit integer
    for (let i = 0; i <= 30; i++) {
      counter.next();
    }

    // After 31 IDs, the counter should overflow to the next index
    // The next ID should be in the second index
    const id = counter.next();
    expect(id[0]).toBe(0); // First index should be 0
    expect(id[1]).toBe(0b1); // Second index should start with 0b1
  });

  it('should handle custom sizes correctly', () => {
    const customSize = 8;
    const counter = new ComponentTypeIdFlagCounter(customSize);
    expect(counter.size).toBe(customSize);

    const id = counter.next();
    expect(id.length).toBe(customSize);
  });
});
