import { useCallback, useState } from 'react';

const PREFIX = 'bim-ecs-devtools:';

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return initial;

    const stored = JSON.parse(raw);
    // Objects are merged with the defaults: settings added by a new version must not be lost
    return isPlainObject(initial) && isPlainObject(stored) ? ({ ...initial, ...stored } as T) : (stored as T);
  } catch {
    return initial;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage is a convenience: it can be unavailable or full
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Like `useState`, but survives panel reloads */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState(() => read(key, initial));

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next;
        write(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
