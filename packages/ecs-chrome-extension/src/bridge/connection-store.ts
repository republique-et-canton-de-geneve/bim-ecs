import type { WorldInfo, WorldState } from '@bim-ecs/devtools-protocol';
import type { BridgeClient, WorldApi } from './bridge-client';

export type ConnectionState =
  /** Looking for a world in the page */
  | { status: 'connecting' }
  /** The page has no hook: the plugin is not installed (or the page has not loaded it yet) */
  | { status: 'no-hook' }
  /** The page and the extension do not speak the same protocol version */
  | { status: 'incompatible'; pageProtocol: number; expectedProtocol: number }
  | { status: 'ready'; worlds: WorldInfo[]; worldId: string; world: WorldState; api: WorldApi }
  | { status: 'error'; message: string };

export interface ConnectionOptions {
  /** Delay between two polls (default: 500ms) */
  pollIntervalMs?: number;
  /** The world to select when available */
  preferredWorldId?: string;
  /** Polling is suspended while it returns false: a hidden panel must not cost anything to the inspected page */
  isActive?: () => boolean;
}

/**
 * Keeps the panel connected to a world of the inspected page.
 *
 * The page can reload, the plugin can be installed late and worlds come and go: the store polls the (cheap) state of
 * the selected world, and falls back to discovery whenever the page stops answering.
 */
export class ConnectionStore {
  #state: ConnectionState = { status: 'connecting' };
  readonly #listeners = new Set<() => void>();
  readonly #pollIntervalMs: number;
  readonly #isActive: () => boolean;

  #selectedWorldId: string | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #generation = 0;
  #ticks = 0;
  #started = false;

  constructor(
    private readonly client: BridgeClient,
    options: ConnectionOptions = {},
  ) {
    this.#pollIntervalMs = options.pollIntervalMs ?? 500;
    this.#isActive = options.isActive ?? (() => true);
    this.#selectedWorldId = options.preferredWorldId;
  }

  /** Current state (stable identity until something changes: suitable for `useSyncExternalStore`) */
  public getState = () => this.#state;

  public subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => void this.#listeners.delete(listener);
  };

  /** Starts polling */
  public start() {
    if (this.#started) return;
    this.#started = true;
    void this.#tick();
  }

  /** Stops polling */
  public stop() {
    this.#started = false;
    this.#generation++;
    clearTimeout(this.#timer);
  }

  /** Forgets the current connection and looks for worlds again (e.g. the page navigated) */
  public reconnect() {
    this.#generation++;
    clearTimeout(this.#timer);
    this.#set({ status: 'connecting' });
    if (this.#started) void this.#tick();
  }

  /** Selects the world to inspect */
  public selectWorld(worldId: string) {
    if (this.#selectedWorldId === worldId) return;
    this.#selectedWorldId = worldId;
    this.reconnect();
  }

  async #tick() {
    const generation = this.#generation;
    const isStale = () => generation !== this.#generation;

    try {
      if (!this.#isActive()) {
        // Suspended
      } else if (this.#state.status === 'ready') {
        await this.#refreshWorld(this.#state, isStale);
      } else {
        await this.#discover(isStale);
      }
    } catch (error) {
      if (isStale()) return;
      // The page does not answer anymore (navigation, world disposed...): discovery will tell what remains
      this.#set(
        this.#state.status === 'ready'
          ? { status: 'connecting' }
          : { status: 'error', message: error instanceof Error ? error.message : String(error) },
      );
    }

    if (!isStale() && this.#started) {
      this.#timer = setTimeout(() => void this.#tick(), this.#pollIntervalMs);
    }
  }

  async #discover(isStale: () => boolean) {
    const discovery = await this.client.discover();
    if (isStale()) return;

    if (discovery.status !== 'ok') return this.#set(discovery);
    if (!discovery.worlds.length) return this.#set({ status: 'no-hook' });

    const worldId = discovery.worlds.some((w) => w.id === this.#selectedWorldId)
      ? this.#selectedWorldId!
      : discovery.worlds[0].id;
    this.#selectedWorldId = worldId;

    const api = this.client.world(worldId);
    const world = await api.info();
    if (isStale()) return;

    this.#set({ status: 'ready', worlds: discovery.worlds, worldId, world, api });
  }

  async #refreshWorld(state: Extract<ConnectionState, { status: 'ready' }>, isStale: () => boolean) {
    // Worlds come and go less often than the state of a world changes: they are looked at every few polls
    const lookForWorlds = ++this.#ticks % WORLDS_LOOKUP_PERIOD === 0;
    const [world, discovery] = await Promise.all([
      state.api.info(),
      lookForWorlds ? this.client.discover() : undefined,
    ]);
    if (isStale()) return;

    if (discovery && (discovery.status !== 'ok' || !discovery.worlds.some((w) => w.id === state.worldId))) {
      // The world is gone: start over
      return this.#set({ status: 'connecting' });
    }

    const worlds =
      discovery?.status === 'ok' && !sameWorlds(discovery.worlds, state.worlds) ? discovery.worlds : undefined;
    if (worlds || !sameWorldState(world, state.world)) this.#set({ ...state, world, worlds: worlds ?? state.worlds });
  }

  #set(state: ConnectionState) {
    if (sameConnectionState(this.#state, state)) return;

    this.#state = state;
    this.#listeners.forEach((listener) => listener());
  }
}

/** The worlds list is refreshed once every `WORLDS_LOOKUP_PERIOD` polls */
const WORLDS_LOOKUP_PERIOD = 4;

function sameWorlds(a: WorldInfo[], b: WorldInfo[]) {
  return a.length === b.length && a.every((world, index) => world.id === b[index].id && world.name === b[index].name);
}

/** Polls often produce the same state: listeners must not be disturbed for nothing */
function sameConnectionState(a: ConnectionState, b: ConnectionState) {
  if (a.status !== b.status) return false;

  switch (a.status) {
    case 'incompatible':
      return a.pageProtocol === (b as typeof a).pageProtocol;
    case 'error':
      return a.message === (b as typeof a).message;
    case 'ready':
      return false; // Ready states are only set when something changed
    default:
      return true;
  }
}

function sameWorldState(a: WorldState, b: WorldState) {
  return (
    a.id === b.id &&
    a.running === b.running &&
    a.revision === b.revision &&
    a.systems === b.systems &&
    a.entities === b.entities
  );
}
