import { QueryDefinition } from './query-definition.ts';
import { QueryClr } from './_builder/query-clr.ts';
import { filter } from '@bim/iterable';
import { without } from './_builder/without.ts';
import { withValue } from './_builder/with-value.ts';
import { withComponent } from './_builder/with-component.ts';
import { MODIFIER_RESULT } from './_builder/modifier-result.ts';
import type { EcsComponent } from '../components';

/**
 * Performs the compilation step of the query from definition
 * @param queryDefinition The query definition to compile
 * @returns Compiled query
 */
export function compileQueryDefinition(queryDefinition: QueryDefinition) {
  const shell = new QueryClr();
  for (const withItem of filter(
    queryDefinition({ without: without(shell), withValue: withValue(shell), include: withComponent(shell) }),
    (item) => item !== MODIFIER_RESULT,
  )) {
    shell.with.add(withItem as typeof EcsComponent<any>);
  }

  return shell;
}
