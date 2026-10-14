import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEVTOOLS_PROTOCOL_VERSION,
  type DevtoolsApiMethod,
  type DevtoolsCallResult,
  type WorldState,
} from '@bim-ecs/devtools-protocol';
import { BridgeClient, BridgeError } from './bridge-client';
import { ConnectionStore } from './connection-store';
import type { HookDiscovery, Transport } from './transport';

/** A page which can be changed while the panel is connected */
class FakePage implements Transport {
  hook: HookDiscovery | null = null;
  state: WorldState = { id: 'world-1', name: 'World 1', running: true, revision: 0, systems: 1, entities: 0 };
  failing = false;
  calls: DevtoolsApiMethod[] = [];

  async discover() {
    if (this.failing) throw new Error('page is gone');
    return this.hook;
  }

  async call(_: string, method: DevtoolsApiMethod): Promise<DevtoolsCallResult> {
    this.calls.push(method);
    if (this.failing) throw new Error('page is gone');
    return method === 'info' ? { ok: true, value: this.state } : { ok: false, error: `${method} is not faked` };
  }
}

const WORLD = { id: 'world-1', name: 'World 1' };

/** Lets pending promises (and the timers they schedule) settle */
const settle = () => vi.advanceTimersByTimeAsync(0);

describe('BridgeClient', () => {
  it('should state the page has no hook', async () => {
    expect(await new BridgeClient(new FakePage()).discover()).toEqual({ status: 'no-hook' });
  });

  it('should detect an incompatible protocol', async () => {
    const page = new FakePage();
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION + 1, worlds: [WORLD] };

    expect(await new BridgeClient(page).discover()).toEqual({
      status: 'incompatible',
      pageProtocol: DEVTOOLS_PROTOCOL_VERSION + 1,
      expectedProtocol: DEVTOOLS_PROTOCOL_VERSION,
    });
  });

  it('should reject calls the page failed to answer', async () => {
    const page = new FakePage();
    const world = new BridgeClient(page).world('world-1');

    await expect(world.components()).rejects.toThrow(BridgeError);
    await expect(world.components()).rejects.toThrow('components is not faked');
  });
});

describe('ConnectionStore', () => {
  let page: FakePage;
  let store: ConnectionStore;

  beforeEach(() => {
    vi.useFakeTimers();
    page = new FakePage();
    store = new ConnectionStore(new BridgeClient(page), { pollIntervalMs: 100 });
  });

  afterEach(() => {
    store.stop();
    vi.useRealTimers();
  });

  it('should wait for the plugin to be installed', async () => {
    store.start();
    await settle();
    expect(store.getState()).toEqual({ status: 'no-hook' });

    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD] };
    await vi.advanceTimersByTimeAsync(100);

    expect(store.getState()).toMatchObject({ status: 'ready', worldId: 'world-1', world: { revision: 0 } });
  });

  it('should follow the state of the world', async () => {
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD] };
    store.start();
    await settle();

    page.state = { ...page.state, revision: 3, running: false };
    await vi.advanceTimersByTimeAsync(100);

    expect(store.getState()).toMatchObject({ status: 'ready', world: { revision: 3, running: false } });
  });

  it('should not disturb listeners while nothing changes', async () => {
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD] };
    const listener = vi.fn();
    store.subscribe(listener);
    store.start();
    await settle();
    const calls = listener.mock.calls.length;

    await vi.advanceTimersByTimeAsync(1000);

    expect(listener.mock.calls.length).toBe(calls);
  });

  it('should fall back to discovery when the page stops answering, then recover', async () => {
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD] };
    store.start();
    await settle();
    expect(store.getState().status).toBe('ready');

    page.failing = true;
    await vi.advanceTimersByTimeAsync(100);
    expect(store.getState().status).toBe('connecting');

    await vi.advanceTimersByTimeAsync(100);
    expect(store.getState()).toMatchObject({ status: 'error', message: 'page is gone' });

    page.failing = false;
    await vi.advanceTimersByTimeAsync(100);
    expect(store.getState().status).toBe('ready');
  });

  it('should leave when the world disappears', async () => {
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD] };
    store.start();
    await settle();

    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [] };
    // Worlds are looked at every few polls
    await vi.advanceTimersByTimeAsync(600);

    expect(store.getState().status).toBe('no-hook');
  });

  it('should select the preferred world, then the one asked for', async () => {
    const other = { id: 'world-2', name: 'World 2' };
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD, other] };
    store = new ConnectionStore(new BridgeClient(page), { pollIntervalMs: 100, preferredWorldId: 'world-2' });
    store.start();
    await settle();
    expect(store.getState()).toMatchObject({ status: 'ready', worldId: 'world-2' });

    page.state = { ...page.state, id: 'world-1' };
    store.selectWorld('world-1');
    await settle();
    expect(store.getState()).toMatchObject({ status: 'ready', worldId: 'world-1' });
  });

  it('should not poll while inactive', async () => {
    let active = false;
    store = new ConnectionStore(new BridgeClient(page), { pollIntervalMs: 100, isActive: () => active });
    page.hook = { protocol: DEVTOOLS_PROTOCOL_VERSION, worlds: [WORLD] };

    store.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.getState().status).toBe('connecting');
    expect(page.calls).toEqual([]);

    active = true;
    await vi.advanceTimersByTimeAsync(100);
    expect(store.getState().status).toBe('ready');
  });
});
