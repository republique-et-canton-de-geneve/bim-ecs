import type { ReactNode } from 'react';
import type { SerializedValue } from '@bim-ecs/devtools-protocol';

interface ValueTreeProps {
  value: SerializedValue;
  /** The depth until which the tree is initially expanded (default: 1) */
  expandedDepth?: number;
}

/** Displays a serialized value as an expandable tree */
export function ValueTree({ value, expandedDepth = 1 }: ValueTreeProps) {
  // The root has no key to put in front of a summary: its content is displayed directly
  if (isObjectLike(value) && expandedDepth > 0) {
    const header = headerOf(value);

    return (
      <div className="vt">
        {header && <div className="vt-class">{header}</div>}
        <Children value={value} depth={0} expandedDepth={expandedDepth} />
      </div>
    );
  }

  return (
    <div className="vt">
      <Node value={value} depth={0} expandedDepth={expandedDepth} />
    </div>
  );
}

interface NodeProps extends ValueTreeProps {
  label?: ReactNode;
  depth: number;
  expandedDepth: number;
}

function Node({ label, value, depth, expandedDepth }: NodeProps) {
  const key = label === undefined ? null : <span className="vt-key">{label}</span>;
  const sep = key && <span className="vt-sep">: </span>;

  if (isObjectLike(value)) {
    return (
      <details className="vt-group" open={depth < expandedDepth}>
        <summary>
          {key}
          {sep}
          <span className="vt-class">{headerOf(value)}</span>
          <span className="vt-preview">{previewOf(value)}</span>
        </summary>
        <Children value={value} depth={depth} expandedDepth={expandedDepth} />
      </details>
    );
  }

  return (
    <div className="vt-row">
      {key}
      {sep}
      <Leaf value={value} />
    </div>
  );
}

function Children({ value, depth, expandedDepth }: { value: ObjectLike; depth: number; expandedDepth: number }) {
  const children = childrenOf(value);
  const hidden = children.total - children.items.length;

  return (
    <div className="vt-children">
      {children.items.map(([childLabel, childValue], index) => (
        <Node key={index} label={childLabel} value={childValue} depth={depth + 1} expandedDepth={expandedDepth} />
      ))}
      {hidden > 0 && <div className="vt-row vt-more">… {hidden} more</div>}
    </div>
  );
}

type ObjectLike = Extract<SerializedValue, { $: 'array' | 'set' | 'map' | 'object' }>;

function isObjectLike(value: SerializedValue): value is ObjectLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value.$ === 'array' || value.$ === 'set' || value.$ === 'map' || value.$ === 'object')
  );
}

function headerOf(value: ObjectLike) {
  switch (value.$) {
    case 'array':
      return `Array(${value.size})`;
    case 'set':
      return `Set(${value.size})`;
    case 'map':
      return `Map(${value.size})`;
    case 'object':
      return value.cls === 'Object' ? '' : value.cls;
  }
}

/** One line summary displayed while collapsed */
function previewOf(value: ObjectLike) {
  const parts: string[] = [];
  const add = (label: string | null, item: SerializedValue) => {
    if (parts.length < 4) parts.push(label === null ? inline(item) : `${label}: ${inline(item)}`);
  };

  switch (value.$) {
    case 'array':
    case 'set':
      value.items.forEach((item) => add(null, item));
      break;
    case 'map':
      value.entries.forEach(([k, v]) => add(inline(k), v));
      break;
    case 'object':
      value.entries.forEach(([k, v]) => add(k, v));
      break;
  }

  const total = value.size;
  const open = value.$ === 'array' ? '[' : '{';
  const close = value.$ === 'array' ? ']' : '}';
  return ` ${open}${parts.join(', ')}${total > parts.length ? ', …' : ''}${close}`;
}

function childrenOf(value: ObjectLike): { items: [ReactNode, SerializedValue][]; total: number } {
  switch (value.$) {
    case 'array':
      return { items: value.items.map((item, index) => [index, item]), total: value.size };
    case 'set':
      return { items: value.items.map((item, index) => [index, item]), total: value.size };
    case 'map':
      return { items: value.entries.map(([k, v]) => [inline(k), v]), total: value.size };
    case 'object':
      return { items: value.entries, total: value.size };
  }
}

/** Compact text of a value, nested structures are summarized */
function inline(value: SerializedValue): string {
  if (isObjectLike(value)) {
    switch (value.$) {
      case 'array':
        return `Array(${value.size})`;
      case 'set':
        return `Set(${value.size})`;
      case 'map':
        return `Map(${value.size})`;
      case 'object':
        return value.cls === 'Object' ? '{…}' : value.cls;
    }
  }

  return leafText(value);
}

function leafText(value: SerializedValue): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value !== 'object') return String(value);

  switch (value.$) {
    case 'undefined':
      return 'undefined';
    case 'number':
      return value.v;
    case 'bigint':
      return `${value.v}n`;
    case 'symbol':
      return value.v;
    case 'function':
      return `ƒ ${value.name}`;
    case 'date':
      return value.v;
    case 'opaque':
      return value.desc ? `${value.cls} <${value.desc}>` : value.cls;
    case 'circular':
      return '[Circular]';
    case 'truncated':
      return value.cls ? `${value.cls} …` : '…';
    default:
      return '?';
  }
}

function Leaf({ value }: { value: SerializedValue }) {
  const kind =
    value === null || (typeof value === 'object' && value.$ === 'undefined')
      ? 'nullish'
      : typeof value === 'object'
        ? 'special'
        : typeof value;

  return <span className={`vt-val vt-${kind}`}>{leafText(value)}</span>;
}
