import { EcsIndexedComponent, EcsMutableComponent, type EcsComponent, type EcsWorld } from '@state-of-geneva/bim-ecs';
import type {
  ArchetypeInfo,
  ComponentKind,
  ComponentsSnapshot,
  ComponentTypeInfo,
  EntitiesPage,
  EntitiesQuery,
  EntityDetail,
  EntitySummary,
} from './protocol';
import { serializeValue } from './serialize-value';

type ComponentType = typeof EcsComponent<any>;

const DEFAULT_PAGE_SIZE = 100;

/** Component type keys: component classes are global, so are their keys */
const componentTypeKeys = new WeakMap<ComponentType, string>();
let componentTypeKeyCounter = 0;

/**
 * Provides the stable identifier of a component type. Names are not identifiers: two classes can share the same one.
 * @param type The component type
 */
export function componentTypeKey(type: ComponentType) {
  let key = componentTypeKeys.get(type);
  if (key === undefined) componentTypeKeys.set(type, (key = `c${componentTypeKeyCounter++}`));
  return key;
}

function componentKindOf(type: ComponentType): ComponentKind {
  if (type.prototype instanceof EcsMutableComponent) return 'mutable';
  if (type.prototype instanceof EcsIndexedComponent) return 'indexed';
  return 'component';
}

/**
 * Describes the component types and the archetypes of the world.
 * The cost is proportional to the number of archetypes, not to the number of entities.
 * @param world The world
 */
export function inspectComponents(world: EcsWorld): ComponentsSnapshot {
  const countsByType = new Map<ComponentType, number>();
  const archetypes: ArchetypeInfo[] = [];
  let entities = 0;

  for (const archetype of world.entities.archetypes()) {
    const count = archetype.entities.size;
    entities += count;

    for (const type of archetype.components) countsByType.set(type, (countsByType.get(type) ?? 0) + count);

    const components = archetype.components.map(componentTypeKey).sort();
    archetypes.push({ key: components.join('+'), components, entities: count });
  }

  const types: ComponentTypeInfo[] = [...countsByType].map(([type, count]) => ({
    key: componentTypeKey(type),
    name: type.name,
    kind: componentKindOf(type),
    entities: count,
  }));

  types.sort((a, b) => b.entities - a.entities || a.name.localeCompare(b.name));
  archetypes.sort((a, b) => b.entities - a.entities || a.key.localeCompare(b.key));

  return { entities, types, archetypes };
}

/**
 * Lists the entities matching the query, page by page.
 * Archetypes are filtered first, so the cost does not depend on the number of entities outside the requested page.
 * @param world The world
 * @param query The filter and the page
 */
export function inspectEntities(world: EcsWorld, query: EntitiesQuery = {}): EntitiesPage {
  const { with: required = [], without: excluded = [], limit = DEFAULT_PAGE_SIZE } = query;
  const entities: EntitySummary[] = [];
  let remainingOffset = Math.max(0, query.offset ?? 0);
  let total = 0;

  for (const archetype of world.entities.archetypes()) {
    const components = archetype.components.map(componentTypeKey);
    if (!required.every((key) => components.includes(key)) || excluded.some((key) => components.includes(key)))
      continue;

    const size = archetype.entities.size;
    total += size;

    if (entities.length >= limit) continue;
    if (remainingOffset >= size) {
      remainingOffset -= size;
      continue;
    }

    let skipped = 0;
    for (const id of archetype.entities) {
      if (skipped++ < remainingOffset) continue;
      entities.push({ id, components });
      if (entities.length >= limit) break;
    }
    remainingOffset = 0;
  }

  return { total, entities };
}

/**
 * Details an entity: its components and their values
 * @param world The world
 * @param id The entity identifier
 */
export function inspectEntity(world: EcsWorld, id: number): EntityDetail | null {
  const components = world.entities.pool.componentsByEntity.get(id);
  if (!components) return null;

  return {
    id,
    components: [...components].map((component) => {
      const type = component.constructor as ComponentType;

      // Own fields other than the value (components can be extended with some)
      const extra = Object.keys(component).filter((key) => key !== '_value');

      return {
        key: componentTypeKey(type),
        name: type.name,
        kind: componentKindOf(type),
        value: serializeValue(component.value),
        ...(extra.length && {
          fields: serializeValue(Object.fromEntries(extra.map((key) => [key, (component as any)[key]]))),
        }),
      };
    }),
  };
}
