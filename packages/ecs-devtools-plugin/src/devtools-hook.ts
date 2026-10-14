import {
  DEVTOOLS_API_METHODS,
  DEVTOOLS_HOOK_KEY,
  DEVTOOLS_PROTOCOL_VERSION,
  type DevtoolsApiMethod,
  type DevtoolsCallResult,
  type DevtoolsHook,
  type WorldInfo,
} from './protocol';
import type { DevtoolsBridge } from './devtools-bridge';

/** The hook, with the members only plugin instances are expected to use */
export interface DevtoolsHostHook extends DevtoolsHook {
  /** Registers a bridge, returns the function unregistering it */
  attach(bridge: DevtoolsBridge): () => void;
  /** Provides the next world number: a hook shared by several plugin copies must keep identifiers unique */
  nextWorldNumber(): number;
}

/** Provides the hook of the page, creating it when it does not exist yet */
export function getOrCreateHook(): DevtoolsHostHook {
  const host = globalThis as Record<string, any>;
  const existing = host[DEVTOOLS_HOOK_KEY] as DevtoolsHostHook | undefined;
  if (existing && typeof existing.attach === 'function') return existing;

  const bridges = new Map<string, DevtoolsBridge>();
  let worldCounter = 0;

  const hook: DevtoolsHostHook = {
    protocol: DEVTOOLS_PROTOCOL_VERSION,

    worlds(): WorldInfo[] {
      return [...bridges.values()].map((bridge) => bridge.worldInfo);
    },

    call(worldId, method, args = []): DevtoolsCallResult {
      const bridge = bridges.get(worldId);
      if (!bridge) return { ok: false, error: `Unknown world "${worldId}"` };
      if (!DEVTOOLS_API_METHODS.includes(method)) return { ok: false, error: `Unknown method "${method}"` };

      try {
        return { ok: true, value: (bridge[method as DevtoolsApiMethod] as (...args: unknown[]) => unknown)(...args) };
      } catch (error) {
        return { ok: false, error: String(error) };
      }
    },

    attach(bridge) {
      bridges.set(bridge.id, bridge);
      return () => void bridges.delete(bridge.id);
    },

    nextWorldNumber: () => ++worldCounter,
  };

  host[DEVTOOLS_HOOK_KEY] = hook;
  return hook;
}
