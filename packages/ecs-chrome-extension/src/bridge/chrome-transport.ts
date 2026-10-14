import { DEVTOOLS_HOOK_KEY, type DevtoolsApiMethod, type DevtoolsCallResult } from '@bim-ecs/devtools-protocol';
import type { HookDiscovery, Transport } from './transport';

const HOOK = `globalThis[${JSON.stringify(DEVTOOLS_HOOK_KEY)}]`;

/** Evaluates an expression in the inspected page and provides its (JSON) result */
function evaluate<T>(expression: string) {
  return new Promise<T>((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval<T>(expression, (result, exception) => {
      if (!exception) return resolve(result as T);

      reject(
        new Error(
          exception.isException
            ? `Page error: ${exception.value}`
            : `DevTools error [${exception.code}]: ${exception.description}`,
        ),
      );
    });
  });
}

/** Reaches the hook by evaluating code in the inspected page, through the devtools extension API */
export class ChromeTransport implements Transport {
  /** @inheritdoc */
  public discover() {
    return evaluate<HookDiscovery | null>(
      `(() => { const hook = ${HOOK}; return hook ? { protocol: hook.protocol, worlds: hook.worlds() } : null; })()`,
    );
  }

  /** @inheritdoc */
  public call(worldId: string, method: DevtoolsApiMethod, args: unknown[]) {
    const call = `${JSON.stringify(worldId)}, ${JSON.stringify(method)}, ${JSON.stringify(args)}`;
    return evaluate<DevtoolsCallResult>(
      `(() => { const hook = ${HOOK}; return hook ? hook.call(${call}) : { ok: false, error: 'The hook is not available anymore' }; })()`,
    );
  }
}
