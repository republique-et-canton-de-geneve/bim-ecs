import { ECS_WORLD_DISPOSING_EVENT, type EcsWorld } from '@state-of-geneva/bim-ecs';
import { DevtoolsBridge } from './devtools-bridge';
import { getOrCreateHook } from './devtools-hook';

export interface DevtoolsPluginOptions {
  /** The name displayed by devtools to identify the world (default: `World <n>`) */
  name?: string;
}

/** Bridges already installed: installing the plugin twice on a world must not register it twice */
const installedBridges = new WeakMap<EcsWorld, DevtoolsBridge>();

/**
 * Exposes the systems, components, entities and resources of the world to devtools (e.g. the browser extension),
 * through the `__BIM_ECS_DEVTOOLS__` global. Nothing is computed until devtools ask for it.
 *
 * @example
 * if (import.meta.env.DEV) world.use(devtoolsPlugin({ name: 'Game' }));
 *
 * @param options The plugin options
 * @returns The plugin, which returns the bridge answering to devtools when applied (useful for tests and custom
 * transports)
 */
export const devtoolsPlugin =
  (options: DevtoolsPluginOptions = {}) =>
  (world: EcsWorld): DevtoolsBridge => {
    const installed = installedBridges.get(world);
    if (installed) return installed;

    const hook = getOrCreateHook();
    const worldNumber = hook.nextWorldNumber();
    const bridge = new DevtoolsBridge(world, `world-${worldNumber}`, options.name ?? `World ${worldNumber}`);
    installedBridges.set(world, bridge);

    const detach = hook.attach(bridge);
    world.bus.subscribe(ECS_WORLD_DISPOSING_EVENT, () => {
      detach();
      bridge[Symbol.dispose]();
      installedBridges.delete(world);
    });

    return bridge;
  };
