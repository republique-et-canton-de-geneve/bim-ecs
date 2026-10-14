import { CATEGORIES, type NodeCategory } from './kind-meta';
import type { RelationMode } from './graph-model';
import type { Density, Direction } from './layout';
import type { EdgeStyle, SystemsSettings } from './settings';

interface SystemsToolbarProps {
  settings: SystemsSettings;
  onChange: (patch: Partial<SystemsSettings>) => void;
  search: string;
  onSearch: (text: string) => void;
  matchCount: number;
  activeMatch: number;
  onNextMatch: () => void;
  onFit: () => void;
  onResetLayout: () => void;
  pinnedCount: number;
  /** Number of nodes per category, to hint what hiding a category removes */
  counts: Record<NodeCategory, number>;
}

export function SystemsToolbar(props: SystemsToolbarProps) {
  const { settings, onChange, search, onSearch, matchCount, activeMatch, onNextMatch, onFit } = props;
  const hidden = new Set(settings.hiddenCategories);

  const toggleCategory = (category: NodeCategory) => {
    const next = new Set(hidden);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onChange({ hiddenCategories: [...next] });
  };

  return (
    <div className="toolbar">
      <div className="search">
        <input
          type="search"
          className="input"
          placeholder="Find a node…"
          title="Enter: go to the next match"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && onNextMatch()}
        />
        {search && (
          <span className="muted search-count">{matchCount ? `${activeMatch + 1}/${matchCount}` : 'no match'}</span>
        )}
      </div>

      <div className="chips" role="group" aria-label="Node categories">
        {CATEGORIES.filter(
          (category) => category.id === 'system' || props.counts[category.id] > 0 || hidden.has(category.id),
        ).map((category) => (
          <button
            key={category.id}
            type="button"
            className={`cat-chip cat-${category.id} ${hidden.has(category.id) ? 'off' : ''}`}
            title={`${category.hint}\n${hidden.has(category.id) ? 'Hidden: click to show' : 'Click to hide (connections are kept)'}`}
            disabled={category.id === 'system'}
            aria-pressed={!hidden.has(category.id)}
            onClick={() => toggleCategory(category.id)}
          >
            <span className="cat-dot" />
            {category.title}
            <span className="cat-count">{props.counts[category.id]}</span>
          </button>
        ))}
      </div>

      <div className="spacer" />

      <button type="button" className="btn" onClick={onFit} title="Fit the graph in the view">
        Fit
      </button>
      <button
        type="button"
        className="btn"
        onClick={props.onResetLayout}
        disabled={!props.pinnedCount}
        title="Forget the positions you have set by dragging nodes"
      >
        Reset layout{props.pinnedCount ? ` (${props.pinnedCount})` : ''}
      </button>

      <details className="menu">
        <summary className="btn">View</summary>
        <div className="menu-panel">
          <label>
            Direction
            <Segmented<Direction>
              value={settings.direction}
              options={[
                ['LR', 'Left → right'],
                ['TB', 'Top → bottom'],
              ]}
              onChange={(direction) => onChange({ direction })}
            />
          </label>
          <label>
            Edges
            <Select<EdgeStyle>
              value={settings.edgeStyle}
              options={[
                ['smoothstep', 'Orthogonal'],
                ['bezier', 'Curved'],
                ['straight', 'Straight'],
              ]}
              onChange={(edgeStyle) => onChange({ edgeStyle })}
            />
          </label>
          <label>
            Density
            <Select<Density>
              value={settings.density}
              options={[
                ['comfortable', 'Comfortable'],
                ['compact', 'Compact'],
              ]}
              onChange={(density) => onChange({ density })}
            />
          </label>
          <label>
            Highlight around a node
            <Select<RelationMode>
              value={settings.relation}
              options={[
                ['all', 'Upstream and downstream'],
                ['upstream', 'What leads to it'],
                ['downstream', 'What it leads to'],
                ['direct', 'Direct neighbours'],
              ]}
              onChange={(relation) => onChange({ relation })}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.isolate}
              onChange={(event) => onChange({ isolate: event.target.checked })}
            />
            Isolate the selection
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.showDisposed}
              onChange={(event) => onChange({ showDisposed: event.target.checked })}
            />
            Show disposed systems
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={settings.minimap}
              onChange={(event) => onChange({ minimap: event.target.checked })}
            />
            Minimap
          </label>
        </div>
      </details>
    </div>
  );
}

function Select<T extends string>(props: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <select className="select" value={props.value} onChange={(event) => props.onChange(event.target.value as T)}>
      {props.options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Segmented<T extends string>(props: {
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <span className="segmented">
      {props.options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          className={value === props.value ? 'on' : ''}
          onClick={() => props.onChange(value)}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
