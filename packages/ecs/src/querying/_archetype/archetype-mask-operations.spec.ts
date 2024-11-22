import { describe, it, expect } from 'vitest';
import { archetypeMaskIncluded } from './archetype-mask-operations';

describe('archetype-mask-operations', () => {
  describe('archetypeMaskIncluded', () => {
    it('should return true when mask1 is included in mask2', () => {
      const mask1 = new Uint32Array([0b001, 0b0]);
      const mask2 = new Uint32Array([0b111, 0b10]);

      const result = archetypeMaskIncluded(mask1, mask2);

      expect(result).toBeTruthy();
    });

    it('should return true when mask1 is included in mask2 on 2nd mask item', () => {
      const mask1 = new Uint32Array([0b0, 0b10]);
      const mask2 = new Uint32Array([0b0, 0b11]);

      const result = archetypeMaskIncluded(mask1, mask2);

      expect(result).toBeTruthy();
    });

    it('should return false when mask1 is not included in mask2 on 1st mask item', () => {
      const mask1 = new Uint32Array([0b001, 0b0]);
      const mask2 = new Uint32Array([0b110, 0b10]);

      const result = archetypeMaskIncluded(mask1, mask2);

      expect(result).toBeFalsy();
    });

    it('should return false when mask1 is not included in mask2 on 2nd mask item', () => {
      const mask1 = new Uint32Array([0b001, 0b01]);
      const mask2 = new Uint32Array([0b111, 0b10]);

      const result = archetypeMaskIncluded(mask1, mask2);

      expect(result).toBeFalsy();
    });
  });
});
