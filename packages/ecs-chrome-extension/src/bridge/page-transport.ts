import {
  DEVTOOLS_HOOK_KEY,
  type DevtoolsApiMethod,
  type DevtoolsCallResult,
  type DevtoolsHook,
} from '@bim-ecs/devtools-protocol';
import type { HookDiscovery, Transport } from './transport';

/**
 * Reaches the hook of the window the code runs in.
 * Used by the harness and by tests: the data goes through JSON like it does through the devtools protocol.
 */
export class PageTransport implements Transport {
  constructor(private readonly host: Record<string, any> = globalThis) {}

  private get hook() {
    return this.host[DEVTOOLS_HOOK_KEY] as DevtoolsHook | undefined;
  }

  /** @inheritdoc */
  public async discover(): Promise<HookDiscovery | null> {
    const hook = this.hook;
    return hook ? roundTrip({ protocol: hook.protocol, worlds: hook.worlds() }) : null;
  }

  /** @inheritdoc */
  public async call(worldId: string, method: DevtoolsApiMethod, args: unknown[]): Promise<DevtoolsCallResult> {
    const hook = this.hook;
    if (!hook) return { ok: false, error: 'The hook is not available anymore' };

    return roundTrip(hook.call(worldId, method, roundTrip(args)));
  }
}

/** Reproduces the serialization boundary of the real transport: what cannot cross it must not work here either */
function roundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null));
}
