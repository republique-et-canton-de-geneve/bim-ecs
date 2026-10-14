import { useCallback, useEffect, useRef, useState } from 'react';

export interface Polled<T> {
  /** The last value (kept while the next one is being fetched) */
  data: T | undefined;
  error: string | undefined;
  /** Fetches immediately */
  refresh: () => void;
}

/**
 * Fetches data from the inspected page, then keeps it fresh.
 * - The previous value stays available while the next one is fetched
 * - Results identical to the previous ones do not re-render
 * - Nothing is fetched while the document is hidden
 *
 * @param fetcher Provides the data (`undefined` to disable)
 * @param deps What the fetcher depends on
 * @param intervalMs Delay between two fetches, `null` to fetch only when `deps` change or on `refresh`
 */
export function usePolled<T>(
  fetcher: (() => Promise<T>) | undefined,
  deps: readonly unknown[],
  intervalMs: number | null,
): Polled<T> {
  const [state, setState] = useState<{ data: T | undefined; error: string | undefined }>({
    data: undefined,
    error: undefined,
  });
  const [nonce, setNonce] = useState(0);
  const lastJson = useRef<string | undefined>(undefined);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const enabled = fetcher !== undefined;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      clearTimeout(timer);

      if (!document.hidden) {
        try {
          const value = await fetcherRef.current!();
          if (cancelled) return;

          // Identical results must not re-render. The comparison stays out of the state updater: React may call
          // updaters twice (StrictMode), they have to be pure.
          const json = JSON.stringify(value);
          if (json === lastJson.current) {
            setState((current) => (current.error ? { ...current, error: undefined } : current));
          } else {
            lastJson.current = json;
            setState({ data: value, error: undefined });
          }
        } catch (error) {
          if (cancelled) return;
          setState((current) => ({ ...current, error: error instanceof Error ? error.message : String(error) }));
        }
      }

      if (!cancelled && intervalMs) timer = setTimeout(run, intervalMs);
    };

    const handleVisibility = () => {
      if (!document.hidden) void run();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    void run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, nonce, ...deps]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, refresh };
}
