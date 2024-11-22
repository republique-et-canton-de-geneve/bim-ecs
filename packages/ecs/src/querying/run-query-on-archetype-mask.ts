import { QueryClr } from './_builder/query-clr';
import { ArchetypeMask } from './_archetype';
import { archetypeMaskExcluded, archetypeMaskIncluded } from './_archetype/archetype-mask-operations';
import { archetypeMaskFor } from './_archetype/archetype-mask-for';
import { ComponentTypeIdFlagCounter } from './component-type-id-flag-counter';

export function runQueryOnArchetypeMask(shell: QueryClr, mask: ArchetypeMask, counter: ComponentTypeIdFlagCounter) {
  return (
    archetypeMaskIncluded(archetypeMaskFor(shell.with, counter), mask) && // "with" processing
    archetypeMaskExcluded(archetypeMaskFor(shell.without, counter), mask) // "without" processing
  );
}
