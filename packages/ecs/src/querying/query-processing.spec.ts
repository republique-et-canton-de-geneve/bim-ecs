import { describe, it, expect } from 'vitest';
import { runQueryChunkOnArchetypeMask } from './query-processing';
import { compileQueryDefinition } from './compile-query';
import { EcsComponent } from '../components';
import { archetypeMaskFor } from './_archetype/archetype-mask-for';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter';

describe('run-query-on-archetype-mask', () => {
  it('should be a match with only inclusive statements', () => {
    class Component1 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();

    const result = runQueryChunkOnArchetypeMask(
      compileQueryDefinition(() => [Component1]),
      archetypeMaskFor([Component1], cacheCounter),
      cacheCounter,
    );

    expect(result).toBeTruthy();
  });

  it('should not be a match with without statement', () => {
    class Component1 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();

    const result = runQueryChunkOnArchetypeMask(
      compileQueryDefinition(({ without }) => [without(Component1)]),
      archetypeMaskFor([Component1], cacheCounter),
      cacheCounter,
    );

    expect(result).toBeFalsy();
  });

  it('should be a match when any component of an anyOf statement is present', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();

    const result = runQueryChunkOnArchetypeMask(
      compileQueryDefinition(({ anyOf }) => [anyOf(Component1, Component2)]),
      archetypeMaskFor([Component2], cacheCounter),
      cacheCounter,
    );

    expect(result).toBeTruthy();
  });

  it('should not be a match when no component of an anyOf statement is present', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}
    class Component3 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();

    const result = runQueryChunkOnArchetypeMask(
      compileQueryDefinition(({ anyOf }) => [anyOf(Component1, Component2)]),
      archetypeMaskFor([Component3], cacheCounter),
      cacheCounter,
    );

    expect(result).toBeFalsy();
  });

  it('should reuse compiled masks across runs and still reflect later query mutations', () => {
    class Component1 extends EcsComponent {}
    class Component2 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();
    const queryClr = compileQueryDefinition(() => [Component1]);
    const mask = archetypeMaskFor([Component1], cacheCounter);

    expect(runQueryChunkOnArchetypeMask(queryClr, mask, cacheCounter)).toBeTruthy();
    expect(queryClr.compiledMasks(cacheCounter)).toBe(queryClr.compiledMasks(cacheCounter)); // cached

    queryClr.with.add(Component2); // mutation invalidates the mask cache

    expect(runQueryChunkOnArchetypeMask(queryClr, mask, cacheCounter)).toBeFalsy();
    expect(
      runQueryChunkOnArchetypeMask(queryClr, archetypeMaskFor([Component1, Component2], cacheCounter), cacheCounter),
    ).toBeTruthy();
  });
});
