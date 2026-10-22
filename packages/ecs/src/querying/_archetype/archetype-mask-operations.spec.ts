import { describe, it, expect } from 'vitest';
import { archetypeMaskIncluded, archetypeMaskIntersecting } from './archetype-mask-operations';

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

  describe('archetypeMaskIntersecting', () => {
    it('should return true when masks share a bit on 1st mask item', () => {
      const mask1 = new Uint32Array([0b011, 0b0]);
      const mask2 = new Uint32Array([0b110, 0b0]);

      const result = archetypeMaskIntersecting(mask1, mask2);

      expect(result).toBeTruthy();
    });

    it('should return true when masks share a bit on 2nd mask item', () => {
      const mask1 = new Uint32Array([0b0, 0b10]);
      const mask2 = new Uint32Array([0b0, 0b11]);

      const result = archetypeMaskIntersecting(mask1, mask2);

      expect(result).toBeTruthy();
    });

    it('should return false when masks share no bit', () => {
      const mask1 = new Uint32Array([0b001, 0b01]);
      const mask2 = new Uint32Array([0b110, 0b10]);

      const result = archetypeMaskIntersecting(mask1, mask2);

      expect(result).toBeFalsy();
    });

    it('should return false when a mask is empty', () => {
      const mask1 = new Uint32Array([0b0, 0b0]);
      const mask2 = new Uint32Array([0b111, 0b11]);

      const result = archetypeMaskIntersecting(mask1, mask2);

      expect(result).toBeFalsy();
    });
  });
});
