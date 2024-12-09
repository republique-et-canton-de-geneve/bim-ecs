import { describe, it, expect } from 'vitest';
import { archetypeMaskFor } from './archetype-mask-for';
import { EcsComponent } from '../../components';
import { COMPONENT_ID_FLAG } from '../component-type-ids';
import { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter';

describe('archetype-mask-for', () => {
  it('should create a mask from components', () => {
    class Component1 extends EcsComponent {
      static [COMPONENT_ID_FLAG] = new Uint32Array([0b1, 0]);
    }
    class Component2 extends EcsComponent {
      static [COMPONENT_ID_FLAG] = new Uint32Array([0b10, 0]);
    }

    const result = archetypeMaskFor([Component1, Component2], new ComponentTypeIdFlagCounter(2));

    expect(result[0]).toBe(0b11);
    expect(result[1]).toBe(0);
  });

  it('should create a mask from components with multiple buffer indices', () => {
    class Component1 extends EcsComponent {
      static [COMPONENT_ID_FLAG] = new Uint32Array([0b1, 0]);
    }
    class Component2 extends EcsComponent {
      static [COMPONENT_ID_FLAG] = new Uint32Array([0, 0b1]);
    }
    class Component3 extends EcsComponent {
      static [COMPONENT_ID_FLAG] = new Uint32Array([0, 0b100]);
    }

    const result = archetypeMaskFor([Component1, Component2, Component3], new ComponentTypeIdFlagCounter(2));

    expect(result[0]).toBe(0b1);
    expect(result[1]).toBe(0b101);
  });

  it('should create a 0 value mask from empty component list', () => {
    const result = archetypeMaskFor([], new ComponentTypeIdFlagCounter(1));
    expect(result[0]).toBe(0);
  });
});
