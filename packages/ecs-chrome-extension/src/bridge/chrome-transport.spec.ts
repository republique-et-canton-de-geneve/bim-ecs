import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineSystem, EcsWorld, startup } from '@state-of-geneva/bim-ecs';
import { devtoolsPlugin } from '@state-of-geneva/bim-ecs-devtools-plugin';
import { DEVTOOLS_HOOK_KEY, DEVTOOLS_PROTOCOL_VERSION } from '@bim-ecs/devtools-protocol';
import { ChromeTransport } from './chrome-transport';

type EvalCallback = (result: unknown, exception: unknown) => void;

/**
 * Plays the role of `chrome.devtools.inspectedWindow.eval`: the expression really runs in the global scope, and its
 * result crosses a JSON boundary, like it does in the inspected page.
 */
function installChromeEval(override?: (callback: EvalCallback) => void) {
  const evaluated: string[] = [];

  (globalThis as any).chrome = {
    devtools: {
      inspectedWindow: {
        eval(expression: string, callback: EvalCallback) {
          evaluated.push(expression);
          if (override) return override(callback);

          try {
            const result = (0, eval)(expression);
            callback(JSON.parse(JSON.stringify(result ?? null)), undefined);
          } catch (error) {
            callback(undefined, { isException: true, value: String(error) });
          }
        },
      },
    },
  };

  return evaluated;
}

describe('ChromeTransport', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[DEVTOOLS_HOOK_KEY];
  });

  afterEach(() => {
    delete (globalThis as any).chrome;
  });

  it('should find no hook in a page without the plugin', async () => {
    installChromeEval();

    expect(await new ChromeTransport().discover()).toBeNull();
  });

  it('should discover worlds and call their methods through evaluated expressions', async () => {
    installChromeEval();
    const world = new EcsWorld();
    world.registerSystem(defineSystem('init', () => {}, startup));
    world.use(devtoolsPlugin({ name: 'Evaluated' }));
    const transport = new ChromeTransport();

    expect(await transport.discover()).toEqual({
      protocol: DEVTOOLS_PROTOCOL_VERSION,
      worlds: [{ id: 'world-1', name: 'Evaluated' }],
    });

    const result = await transport.call('world-1', 'info', []);
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({ id: 'world-1', name: 'Evaluated', systems: 1 }),
    });
  });

  it('should pass arguments safely, whatever they contain', async () => {
    installChromeEval();
    new EcsWorld().use(devtoolsPlugin());
    const transport = new ChromeTransport();

    // A hostile world id must stay data
    expect(await transport.call(`"); throw new Error('injected'); ("`, 'info', [])).toEqual({
      ok: false,
      error: expect.stringContaining('Unknown world'),
    });
  });

  it('should report the page error as an error', async () => {
    installChromeEval((callback) => callback(undefined, { isException: true, value: 'ReferenceError: nope' }));

    await expect(new ChromeTransport().discover()).rejects.toThrow('Page error: ReferenceError: nope');
  });

  it('should report devtools errors as an error', async () => {
    installChromeEval((callback) =>
      callback(undefined, { isError: true, code: 'E_FAILED', description: 'Inspected target navigated' }),
    );

    await expect(new ChromeTransport().call('world-1', 'info', [])).rejects.toThrow(
      'DevTools error [E_FAILED]: Inspected target navigated',
    );
  });
});
