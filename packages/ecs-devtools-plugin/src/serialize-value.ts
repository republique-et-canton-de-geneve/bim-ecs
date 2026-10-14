import type { SerializedValue } from './protocol';

export interface SerializeOptions {
  /** Maximum nesting depth (default: 4) */
  maxDepth?: number;
  /** Maximum number of entries/items kept per collection or object (default: 50) */
  maxEntries?: number;
  /** Maximum length of a string (default: 300) */
  maxStringLength?: number;
  /** Maximum number of nodes of the whole result (default: 1000), bounds the cost whatever the shape of the data is */
  maxNodes?: number;
}

type Limits = Required<SerializeOptions>;

const DEFAULT_LIMITS: Limits = { maxDepth: 4, maxEntries: 50, maxStringLength: 300, maxNodes: 1000 };

/**
 * Converts any value to a JSON-safe and bounded representation: it is safe to call on arbitrary application data
 * (cycles, DOM nodes, huge collections, throwing getters...) and its cost is capped by `maxNodes`.
 * @param value The value to serialize
 * @param options The limits
 */
export function serializeValue(value: unknown, options?: SerializeOptions): SerializedValue {
  const limits = { ...DEFAULT_LIMITS, ...options };
  return serialize(value, 0, new Set(), { remaining: limits.maxNodes }, limits);
}

function serialize(
  value: unknown,
  depth: number,
  ancestors: Set<object>,
  budget: { remaining: number },
  limits: Limits,
): SerializedValue {
  switch (typeof value) {
    case 'string':
      return value.length > limits.maxStringLength ? `${value.slice(0, limits.maxStringLength)}…` : value;
    case 'number':
      if (Number.isFinite(value)) return value;
      return { $: 'number', v: Number.isNaN(value) ? 'NaN' : value > 0 ? 'Infinity' : '-Infinity' };
    case 'boolean':
      return value;
    case 'undefined':
      return { $: 'undefined' };
    case 'bigint':
      return { $: 'bigint', v: value.toString() };
    case 'symbol':
      return { $: 'symbol', v: value.toString() };
    case 'function':
      return { $: 'function', name: value.name || '(anonymous)' };
  }

  if (value === null) return null;

  const object = value as object;
  if (ancestors.has(object)) return { $: 'circular' };

  const cls = classNameOf(object);
  if (--budget.remaining < 0) return { $: 'truncated', cls };

  if (object instanceof Date) {
    return { $: 'date', v: Number.isNaN(object.getTime()) ? 'Invalid Date' : object.toISOString() };
  }
  const opaque = describeOpaque(object);
  if (opaque) return { $: 'opaque', cls, ...(opaque.desc !== undefined && { desc: opaque.desc }) };

  const isCollection = Array.isArray(object) || object instanceof Map || object instanceof Set;
  if (depth >= limits.maxDepth) {
    return { $: 'truncated', cls, ...(isCollection && { size: collectionSize(object) }) };
  }

  ancestors.add(object);
  try {
    const child = (item: unknown) => serialize(item, depth + 1, ancestors, budget, limits);

    if (Array.isArray(object)) {
      return { $: 'array', size: object.length, items: object.slice(0, limits.maxEntries).map(child) };
    }

    if (object instanceof Set) {
      return { $: 'set', size: object.size, items: take(object.values(), limits.maxEntries).map(child) };
    }

    if (object instanceof Map) {
      return {
        $: 'map',
        size: object.size,
        entries: take(object.entries(), limits.maxEntries).map(([k, v]) => [child(k), child(v)]),
      };
    }

    const keys = Object.keys(object);
    return {
      $: 'object',
      cls,
      size: keys.length,
      entries: keys.slice(0, limits.maxEntries).map((key): [string, SerializedValue] => {
        // Accessors are not invoked: they could have side effects or throw
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        return [key, descriptor && 'value' in descriptor ? child(descriptor.value) : { $: 'opaque', cls: 'Getter' }];
      }),
    };
  } catch (error) {
    // Exotic objects (revoked proxies...)
    return { $: 'opaque', cls, desc: `unreadable: ${String(error)}` };
  } finally {
    ancestors.delete(object);
  }
}

/** Provides the constructor name of an object, `Object` when it has no prototype */
function classNameOf(object: object) {
  try {
    return (Object.getPrototypeOf(object)?.constructor?.name as string | undefined) || 'Object';
  } catch {
    return 'Object';
  }
}

function collectionSize(object: object) {
  return Array.isArray(object) ? object.length : (object as Map<unknown, unknown> | Set<unknown>).size;
}

/** Takes up to `count` items of an iterator */
function take<T>(iterator: Iterator<T>, count: number) {
  const items: T[] = [];
  for (let item = iterator.next(); !item.done && items.length < count; item = iterator.next()) items.push(item.value);
  return items;
}

/** Determines whether the object is not worth (or not safe) to inspect, and provides a short description if so */
function describeOpaque(object: object): { desc?: string } | undefined {
  if (typeof Node !== 'undefined' && object instanceof Node) return { desc: object.nodeName };
  if (typeof Window !== 'undefined' && object instanceof Window) return {};
  if (object instanceof Error) return { desc: object.message };
  if (object instanceof RegExp) return { desc: String(object) };
  if (object instanceof Promise) return {};
  if (object instanceof WeakMap || object instanceof WeakSet) return {};
  if (typeof WeakRef !== 'undefined' && object instanceof WeakRef) return {};
  if (object instanceof ArrayBuffer) return { desc: `${object.byteLength} bytes` };
  if (ArrayBuffer.isView(object)) return { desc: `${object.byteLength} bytes` };

  return undefined;
}
