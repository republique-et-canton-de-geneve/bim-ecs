import type { DevtoolsApiMethod, DevtoolsCallResult, WorldInfo } from '@bim-ecs/devtools-protocol';

/** What the hook of the inspected page tells about itself */
export interface HookDiscovery {
  protocol: number;
  worlds: WorldInfo[];
}

/**
 * How the panel reaches the hook of the inspected page.
 * Implementations only move JSON around: everything else lives in the `BridgeClient`.
 */
export interface Transport {
  /** Looks for the hook in the page: `null` when there is none (yet) */
  discover(): Promise<HookDiscovery | null>;

  /** Calls a method of a world through the hook */
  call(worldId: string, method: DevtoolsApiMethod, args: unknown[]): Promise<DevtoolsCallResult>;
}
