/**
 * The contract between the devtools plugin and any consumer (browser extension, in-page overlay, tests...).
 * Everything crossing this boundary is plain JSON: no class instance, no symbol, no presentation concern.
 */

/** Version of the contract. Incremented on breaking changes, consumers are expected to check it. */
export const DEVTOOLS_PROTOCOL_VERSION = 1;

/** Name of the global through which consumers discover the registered worlds */
export const DEVTOOLS_HOOK_KEY = '__BIM_ECS_DEVTOOLS__';

// ---------------------------------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------------------------------

/** A JSON-safe, bounded representation of any runtime value */
export type SerializedValue =
  | null
  | boolean
  | number
  | string
  | { $: 'undefined' }
  | { $: 'number'; v: 'NaN' | 'Infinity' | '-Infinity' }
  | { $: 'bigint'; v: string }
  | { $: 'symbol'; v: string }
  | { $: 'function'; name: string }
  | { $: 'date'; v: string }
  /** `size` is the real size: it is greater than the number of items when the collection has been truncated */
  | { $: 'array'; size: number; items: SerializedValue[] }
  | { $: 'set'; size: number; items: SerializedValue[] }
  | { $: 'map'; size: number; entries: [SerializedValue, SerializedValue][] }
  | { $: 'object'; cls: string; size: number; entries: [string, SerializedValue][] }
  /** A value which is not inspected: DOM nodes, promises, weak collections, getters... */
  | { $: 'opaque'; cls: string; desc?: string }
  | { $: 'circular' }
  /** The depth or the node budget has been reached */
  | { $: 'truncated'; cls?: string; size?: number };

// ---------------------------------------------------------------------------------------------------------------------
// Worlds
// ---------------------------------------------------------------------------------------------------------------------

/** Identifies a world registered on the hook */
export interface WorldInfo {
  id: string;
  name: string;
}

/** The state of a world: cheap to compute, meant to be polled */
export interface WorldState extends WorldInfo {
  running: boolean;
  /** Changes whenever the systems structure or state changes: the cue to fetch `systems()` again */
  revision: number;
  systems: number;
  entities: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// Systems
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Kind of a graph node: `system`, `event`, `command` or the kind of a scheduler (`startup`, `frame`, `timer`,
 * `component-added`, `component-removed`, `component-value-changed`, `entity-spawned`, `entity-removed`, `after`,
 * `when`, `debounce`, `debounce-frame`, `compose`, `custom`...). Consumers must tolerate unknown kinds.
 */
export type GraphNodeKind = string;

export interface GraphNode {
  /** Unique, stable across snapshots as long as the structure does not change */
  id: string;
  kind: GraphNodeKind;
  /** The name of the thing: system name, event name, component name, delay... */
  label: string;
  /** Secondary information, e.g. the components a query excludes */
  detail?: string;
  /** Only for `system` nodes registered in the world */
  system?: { id: number; running: boolean; disposed: boolean };
}

/**
 * - `schedule`: the source triggers the target (event, command, component change, startup... or a modifier chain)
 * - `after`: the target runs once the source system has been processed
 * - `publish`: the system publishes the event when processed
 * - `trigger`: the system triggers the command when processed
 */
export type GraphEdgeKind = 'schedule' | 'after' | 'publish' | 'trigger';

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: GraphEdgeKind;
}

export interface SystemsGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SystemsSnapshot {
  revision: number;
  graph: SystemsGraph;
}

// ---------------------------------------------------------------------------------------------------------------------
// Components & entities
// ---------------------------------------------------------------------------------------------------------------------

export type ComponentKind = 'component' | 'mutable' | 'indexed';

export interface ComponentTypeInfo {
  /** Stable identifier of the component type, used to filter entities */
  key: string;
  name: string;
  kind: ComponentKind;
  /** The number of entities holding the component type */
  entities: number;
}

export interface ArchetypeInfo {
  key: string;
  /** The component type keys of the archetype */
  components: string[];
  entities: number;
}

export interface ComponentsSnapshot {
  /** The total number of entities */
  entities: number;
  types: ComponentTypeInfo[];
  archetypes: ArchetypeInfo[];
}

export interface EntitiesQuery {
  /** Component type keys the entities must hold */
  with?: string[];
  /** Component type keys the entities must not hold */
  without?: string[];
  /** Defaults to 0 */
  offset?: number;
  /** Defaults to 100 */
  limit?: number;
}

export interface EntitySummary {
  id: number;
  /** The component type keys of the entity */
  components: string[];
}

export interface EntitiesPage {
  /** The number of entities matching the query, whatever the page is */
  total: number;
  entities: EntitySummary[];
}

export interface EntityComponentDetail {
  key: string;
  name: string;
  kind: ComponentKind;
  value: SerializedValue;
  /** Additional own fields of the component, when it defines some */
  fields?: SerializedValue;
}

export interface EntityDetail {
  id: number;
  components: EntityComponentDetail[];
}

// ---------------------------------------------------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------------------------------------------------

export interface ResourceInfo {
  key: string;
  name: string;
}

export interface ResourceDetail extends ResourceInfo {
  value: SerializedValue;
}

// ---------------------------------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------------------------------

/** What a consumer can ask to a world. Every method is synchronous and returns JSON-safe data. */
export interface DevtoolsApi {
  info(): WorldState;
  systems(): SystemsSnapshot;
  components(): ComponentsSnapshot;
  entities(query?: EntitiesQuery): EntitiesPage;
  /** `null` when the entity does not exist */
  entity(id: number): EntityDetail | null;
  resources(): ResourceInfo[];
  /** `null` when the resource does not exist anymore */
  resource(key: string): ResourceDetail | null;
}

/** Names of the `DevtoolsApi` methods */
export const DEVTOOLS_API_METHODS = [
  'info',
  'systems',
  'components',
  'entities',
  'entity',
  'resources',
  'resource',
] as const satisfies ReadonlyArray<keyof DevtoolsApi>;

export type DevtoolsApiMethod = (typeof DEVTOOLS_API_METHODS)[number];

/** Outcome of a call through the hook: errors travel as data, so they are never lost between contexts */
export type DevtoolsCallResult<T = unknown> = { ok: true; value: T } | { ok: false; error: string };

/** The global object registered on `globalThis[DEVTOOLS_HOOK_KEY]` */
export interface DevtoolsHook {
  readonly protocol: number;
  /** The worlds currently registered */
  worlds(): WorldInfo[];
  /** The single entry point for consumers evaluating code in the page */
  call(worldId: string, method: DevtoolsApiMethod, args?: unknown[]): DevtoolsCallResult;
}
