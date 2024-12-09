import { describe, it, expect } from 'vitest';
import type { Archetype } from './archetype';
import { areArchetypeMatching } from './are-archetype-matching';
import { EcsComponent } from '../../components';
import { ComponentTypeIdFlagCounter } from '../component-type-id-flag-counter';

describe('areArchetypeMatching', () => {
  it('should return true for matching archetypes, even if order is different', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    const archetype1: Archetype = [Component1, Component2, Component3];
    const archetype2: Archetype = [Component1, Component3, Component2];

    const counter = new ComponentTypeIdFlagCounter(2);

    const result = areArchetypeMatching(archetype1, archetype2, counter);
    expect(result).toBe(true);
  });

  it('should return false for non-matching archetypes', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    const archetype1: Archetype = [Component1, Component3];
    const archetype2: Archetype = [Component1, Component2];

    const counter = new ComponentTypeIdFlagCounter(2);

    const result = areArchetypeMatching(archetype1, archetype2, counter);
    expect(result).toBe(false);
  });

  it('should return true for empty archetypes', () => {
    const archetype1: Archetype = [];
    const archetype2: Archetype = [];

    const counter = new ComponentTypeIdFlagCounter(2);

    const result = areArchetypeMatching(archetype1, archetype2, counter);
    expect(result).toBe(true);
  });

  it('should return false when sizes are mismatched', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    const archetype1: Archetype = [Component1, Component2, Component3];
    const archetype2: Archetype = [Component1, Component2];

    const counter = new ComponentTypeIdFlagCounter(2);

    const result = areArchetypeMatching(archetype1, archetype2, counter);
    expect(result).toBe(false);
  });
});
