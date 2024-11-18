import { QueryClr } from './_builder/query-clr.ts';
import { ArchetypeMask } from './_archetype';
import { archetypeMaskExcluded, archetypeMaskIncluded } from './_archetype/archetype-mask-operations.ts';
import { archetypeMaskFor } from './_archetype/archetype-mask-for.ts';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter.ts';

export function runQueryOnArchetypeMask(shell: QueryClr, mask: ArchetypeMask, counter: ComponentTypeIdFlagCounter) {
  return (
    archetypeMaskIncluded(archetypeMaskFor(shell.with, counter), mask) && // "with" processing
    archetypeMaskExcluded(archetypeMaskFor(shell.without, counter), mask) // "without" processing
  );
}
