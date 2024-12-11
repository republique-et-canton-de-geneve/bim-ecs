import type { QueryDefinition } from './query-definition';
import { QueryClr } from './_builder/query-clr';
import { filter } from '@bim-ecs/iterable';
import { without } from './_builder/without';
import { withValue } from './_builder/with-value';
import { withComponent } from './_builder/with-component';
import { MODIFIER_RESULT } from './_builder/modifier-result';
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
