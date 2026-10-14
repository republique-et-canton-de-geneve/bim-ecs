import {
  DEVTOOLS_PROTOCOL_VERSION,
  type DevtoolsApi,
  type DevtoolsApiMethod,
  type WorldInfo,
} from '@bim-ecs/devtools-protocol';
import type { Transport } from './transport';

/** The API of a world, seen from the panel: calls are asynchronous */
export type WorldApi = {
  [Method in keyof DevtoolsApi]: (...args: Parameters<DevtoolsApi[Method]>) => Promise<ReturnType<DevtoolsApi[Method]>>;
};

/** What a discovery found in the inspected page */
export type Discovery =
  | { status: 'no-hook' }
  | { status: 'incompatible'; pageProtocol: number; expectedProtocol: number }
  | { status: 'ok'; worlds: WorldInfo[] };

/** An error reported by the page while answering a call */
export class BridgeError extends Error {
  override readonly name = 'BridgeError';
}

/** Typed access to the worlds of the inspected page */
export class BridgeClient {
  constructor(private readonly transport: Transport) {}

  /** Looks for worlds in the page, and checks the page speaks the same protocol */
  public async discover(): Promise<Discovery> {
    const hook = await this.transport.discover();
    if (!hook) return { status: 'no-hook' };

    if (hook.protocol !== DEVTOOLS_PROTOCOL_VERSION) {
      return { status: 'incompatible', pageProtocol: hook.protocol, expectedProtocol: DEVTOOLS_PROTOCOL_VERSION };
    }

    return { status: 'ok', worlds: hook.worlds };
  }

  /** Provides the API of a world */
  public world(worldId: string): WorldApi {
    const call = async <Method extends DevtoolsApiMethod>(method: Method, args: unknown[]) => {
      const result = await this.transport.call(worldId, method, args);
      if (!result.ok) throw new BridgeError(result.error);

      return result.value as ReturnType<DevtoolsApi[Method]>;
    };

    return {
      info: () => call('info', []),
      systems: () => call('systems', []),
      components: () => call('components', []),
      entities: (query) => call('entities', [query]),
      entity: (id) => call('entity', [id]),
      resources: () => call('resources', []),
      resource: (key) => call('resource', [key]),
    };
  }
}
