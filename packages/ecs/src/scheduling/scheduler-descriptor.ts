import type { QueryClr } from '../querying/_builder/query-clr';

/**
 * Plain, serializable and presentation-free description of a scheduler.
 * It only carries facts: how to display them is up to the consumer (devtools, logs, tests...).
 */
export interface SchedulerDescriptor {
  /**
   * Discriminator of the scheduler.
   * Built-in values: `startup`, `frame`, `timer`, `on`, `at-command`, `after`, `entity-spawned`, `entity-removed`,
   * `component-added`, `component-removed`, `component-value-changed`, `when`, `debounce`, `debounce-frame`, `compose`
   * and `custom` (any scheduler not describing itself).
   */
  kind: string;

  /** Names of what the scheduler is bound to: events, command, component types, queried component types... */
  labels?: string[];

  /** Names of the component types a query excludes */
  without?: string[];

  /** Names of the component types of each "or" group a query requires (at least one component per group) */
  anyOf?: string[][];

  /** Identifiers of the systems the scheduler waits for */
  systems?: number[];

  /** The wrapped schedulers (modifiers) */
  children?: SchedulerDescriptor[];

  /** Scalar parameters: delay, combination mode, predicate name... */
  params?: Record<string, string | number | boolean>;
}

/**
 * Describes a scheduler filtering entities through a compiled query
 * @param kind The scheduler kind
 * @param query The compiled query
 */
export function describeQuery(kind: string, query: QueryClr): SchedulerDescriptor {
  const names = (types: Iterable<{ name: string }>) => Array.from(types, (type) => type.name);

  const descriptor: SchedulerDescriptor = { kind, labels: [...names(query.with), ...names(query.withValueComponents)] };
  if (query.without.size) descriptor.without = names(query.without);
  if (query.anyOf.length) descriptor.anyOf = query.anyOf.map(names);

  return descriptor;
}

/**
 * Provides a readable name for a symbol-based key (event, command...)
 * @param key The key
 */
export function keyName(key: unknown) {
  return (key as symbol).description || '#no name';
}
