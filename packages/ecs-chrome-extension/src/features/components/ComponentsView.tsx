import { useCallback, useMemo, useState } from 'react';
import type { ArchetypeInfo, ComponentTypeInfo, EntitiesPage, SerializedValue } from '@bim-ecs/devtools-protocol';
import { useReadyConnection } from '../../bridge/connection-context';
import { usePolled } from '../../bridge/use-polled';
import { colorOf } from '../../ui/color';
import { ValueTree } from '../../ui/ValueTree';

const PAGE_SIZE = 100;

/** `with`: entities must hold the component, `without`: they must not */
type FilterMode = 'with' | 'without';

interface ComponentsViewProps {
  /** The delay between refreshes, `null` to refresh on demand only */
  refreshMs: number | null;
  /** The text initially searched in component types */
  initialSearch?: string;
  onFindInSystems: (componentName: string) => void;
}

export function ComponentsView({ refreshMs, initialSearch = '', onFindInSystems }: ComponentsViewProps) {
  const { api } = useReadyConnection();

  const [typeSearch, setTypeSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<Record<string, FilterMode>>({});
  const [offset, setOffset] = useState(0);
  const [selectedEntity, setSelectedEntity] = useState<number>();

  const required = useMemo(() => keysWithMode(filters, 'with'), [filters]);
  const excluded = useMemo(() => keysWithMode(filters, 'without'), [filters]);

  const { data: snapshot, error } = usePolled(() => api.components(), [api], refreshMs);
  const { data: page } = usePolled(
    () => api.entities({ with: required, without: excluded, offset, limit: PAGE_SIZE }),
    [api, required, excluded, offset],
    refreshMs,
  );
  const { data: detail } = usePolled(
    selectedEntity === undefined ? undefined : () => api.entity(selectedEntity),
    [api, selectedEntity],
    refreshMs,
  );

  const typesByKey = useMemo(() => new Map(snapshot?.types.map((type) => [type.key, type])), [snapshot]);
  const nameOf = useCallback((key: string) => typesByKey.get(key)?.name ?? key, [typesByKey]);

  /** Click cycles: ignored → required → excluded → ignored */
  const cycleFilter = (key: string) => {
    setOffset(0);
    setFilters((current) => {
      const { [key]: mode, ...others } = current;
      return mode === undefined
        ? { ...others, [key]: 'with' }
        : mode === 'with'
          ? { ...others, [key]: 'without' }
          : others;
    });
  };

  const selectArchetype = (archetype: ArchetypeInfo) => {
    setOffset(0);
    setFilters(Object.fromEntries(archetype.components.map((key) => [key, 'with' as const])));
  };

  const clearFilters = () => {
    setOffset(0);
    setFilters({});
  };

  if (error && !snapshot) return <div className="banner banner-error">{error}</div>;
  if (!snapshot) return <div className="empty">Loading…</div>;

  const visibleTypes = snapshot.types.filter((type) =>
    type.name.toLowerCase().includes(typeSearch.trim().toLowerCase()),
  );
  const maxTypeCount = Math.max(1, ...snapshot.types.map((type) => type.entities));
  const maxArchetypeCount = Math.max(1, ...snapshot.archetypes.map((archetype) => archetype.entities));
  const activeFilters = Object.entries(filters);

  return (
    <div className="components">
      <section className="panel types">
        <header>
          <h3>Component types</h3>
          <span className="muted">
            {snapshot.types.length} types · {snapshot.entities} entities
          </span>
        </header>
        <input
          type="search"
          className="input"
          placeholder="Filter types…"
          value={typeSearch}
          onChange={(event) => setTypeSearch(event.target.value)}
        />
        <ul className="scroll">
          {visibleTypes.map((type) => (
            <TypeRow
              key={type.key}
              type={type}
              mode={filters[type.key]}
              max={maxTypeCount}
              onClick={() => cycleFilter(type.key)}
              onFindInSystems={() => onFindInSystems(type.name)}
            />
          ))}
          {!visibleTypes.length && <li className="muted pad">No component type.</li>}
        </ul>
      </section>

      <section className="panel archetypes">
        <header>
          <h3>Archetypes</h3>
          <span className="muted">{snapshot.archetypes.length} distinct sets of components</span>
        </header>
        <ul className="scroll">
          {snapshot.archetypes.map((archetype) => (
            <li key={archetype.key}>
              <button type="button" className="row archetype" onClick={() => selectArchetype(archetype)}>
                <span className="chips">
                  {archetype.components.length ? (
                    archetype.components.map((key) => <Chip key={key} name={nameOf(key)} />)
                  ) : (
                    <span className="muted">no component</span>
                  )}
                </span>
                <Bar value={archetype.entities} max={maxArchetypeCount} label={String(archetype.entities)} />
              </button>
            </li>
          ))}
          {!snapshot.archetypes.length && <li className="muted pad">No entity.</li>}
        </ul>
      </section>

      <section className="panel entities">
        <header>
          <h3>Entities</h3>
          <Pager page={page} offset={offset} onOffset={setOffset} />
        </header>

        <div className="filters">
          {activeFilters.length ? (
            <>
              {activeFilters.map(([key, mode]) => (
                <button key={key} type="button" className={`filter filter-${mode}`} onClick={() => cycleFilter(key)}>
                  {mode === 'with' ? '+' : '−'} {nameOf(key)}
                </button>
              ))}
              <button type="button" className="btn" onClick={clearFilters}>
                Clear
              </button>
            </>
          ) : (
            <span className="muted">
              Click a component type or an archetype to filter. Click a type again to exclude it.
            </span>
          )}
        </div>

        <ul className="scroll">
          {page?.entities.map((entity) => (
            <li key={entity.id}>
              <button
                type="button"
                className={`row entity ${entity.id === selectedEntity ? 'selected' : ''}`}
                onClick={() => setSelectedEntity(entity.id)}
              >
                <span className="entity-id">#{entity.id}</span>
                <span className="chips">
                  {entity.components.map((key) => (
                    <Chip key={key} name={nameOf(key)} />
                  ))}
                </span>
              </button>
            </li>
          ))}
          {page && !page.entities.length && <li className="muted pad">No entity matches.</li>}
        </ul>
      </section>

      <section className="panel detail">
        <header>
          <h3>{selectedEntity === undefined ? 'Entity' : `Entity #${selectedEntity}`}</h3>
        </header>
        {selectedEntity === undefined && <div className="muted pad">Select an entity to see its components.</div>}
        {selectedEntity !== undefined && detail === null && (
          <div className="muted pad">This entity does not exist anymore.</div>
        )}
        {detail && detail.id === selectedEntity && (
          <div className="scroll">
            {detail.components.map((component) => (
              <article
                key={component.key}
                className="component-card"
                style={{ borderLeftColor: colorOf(component.name) }}
              >
                <h4>
                  {component.name}
                  {component.kind !== 'component' && <span className="badge">{component.kind}</span>}
                  <button type="button" className="link" onClick={() => onFindInSystems(component.name)}>
                    in systems
                  </button>
                </h4>
                {isUndefined(component.value) ? (
                  <div className="muted">no value</div>
                ) : (
                  <ValueTree value={component.value} expandedDepth={2} />
                )}
                {component.fields !== undefined && (
                  <>
                    <div className="muted">Fields</div>
                    <ValueTree value={component.fields} expandedDepth={2} />
                  </>
                )}
              </article>
            ))}
            {!detail.components.length && <div className="muted pad">This entity has no component.</div>}
          </div>
        )}
      </section>
    </div>
  );
}

/** Components like `EcsComponent<void>` only mark entities */
function isUndefined(value: SerializedValue) {
  return typeof value === 'object' && value !== null && value.$ === 'undefined';
}

function keysWithMode(filters: Record<string, FilterMode>, mode: FilterMode) {
  return Object.keys(filters)
    .filter((key) => filters[key] === mode)
    .sort();
}

function Chip({ name }: { name: string }) {
  return (
    <span className="chip" style={{ ['--chip' as string]: colorOf(name) }}>
      {name}
    </span>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span className="bar" aria-label={label}>
      <span className="bar-fill" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      <span className="bar-label">{label}</span>
    </span>
  );
}

function TypeRow(props: {
  type: ComponentTypeInfo;
  mode: FilterMode | undefined;
  max: number;
  onClick: () => void;
  onFindInSystems: () => void;
}) {
  const { type, mode } = props;

  return (
    <li>
      <button
        type="button"
        className={`row type ${mode ? `filter-${mode}` : ''}`}
        onClick={props.onClick}
        title="Click: require this component · again: exclude it · again: ignore it"
      >
        <span className="mode">{mode === 'with' ? '+' : mode === 'without' ? '−' : ''}</span>
        <Chip name={type.name} />
        {type.kind !== 'component' && <span className="badge">{type.kind}</span>}
        <Bar value={type.entities} max={props.max} label={String(type.entities)} />
      </button>
    </li>
  );
}

function Pager(props: { page: EntitiesPage | undefined; offset: number; onOffset: (offset: number) => void }) {
  const total = props.page?.total ?? 0;
  const from = total ? props.offset + 1 : 0;
  const to = Math.min(total, props.offset + PAGE_SIZE);

  return (
    <span className="pager">
      <span className="muted">
        {from}–{to} of {total}
      </span>
      <button
        type="button"
        className="btn icon"
        disabled={props.offset === 0}
        onClick={() => props.onOffset(Math.max(0, props.offset - PAGE_SIZE))}
        aria-label="Previous page"
      >
        ‹
      </button>
      <button
        type="button"
        className="btn icon"
        disabled={to >= total}
        onClick={() => props.onOffset(props.offset + PAGE_SIZE)}
        aria-label="Next page"
      >
        ›
      </button>
    </span>
  );
}
