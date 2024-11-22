import { describe, it, expect } from 'vitest';
import { runQueryOnArchetypeMask } from './run-query-on-archetype-mask';
import { compileQueryDefinition } from './compile-query';
import { EcsComponent } from '../components';
import { archetypeMaskFor } from './_archetype/archetype-mask-for';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter';

describe('run-query-on-archetype-mask', () => {
  it('should be a match with only inclusive statements', () => {
    class Component1 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();

    const result = runQueryOnArchetypeMask(
      compileQueryDefinition(() => [Component1]),
      archetypeMaskFor([Component1], cacheCounter),
      cacheCounter,
    );

    expect(result).toBeTruthy();
  });

  it('should not be a match with without statement', () => {
    class Component1 extends EcsComponent {}

    const cacheCounter = new ComponentTypeIdFlagCounter();

    const result = runQueryOnArchetypeMask(
      compileQueryDefinition(({ without }) => [without(Component1)]),
      archetypeMaskFor([Component1], cacheCounter),
      cacheCounter,
    );

    expect(result).toBeFalsy();
  });
});
