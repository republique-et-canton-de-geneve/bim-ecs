import { beforeEach, describe, expect, it } from 'vitest';
import {
  defineSystem,
  EcsComponent,
  EcsMutableComponent,
  EcsWorld,
  on,
  startup,
  type EcsEvent,
} from '@state-of-geneva/bim-ecs';
import { devtoolsPlugin } from '@state-of-geneva/bim-ecs-devtools-plugin';
import { DEVTOOLS_HOOK_KEY } from '@bim-ecs/devtools-protocol';
import { BridgeClient } from './bridge-client';
import { PageTransport } from './page-transport';

class Position extends EcsComponent<{ x: number; y: number }> {}
class Health extends EcsMutableComponent<number> {}

const READY = Symbol('READY') as EcsEvent<void>;

/** The whole chain: real world, real plugin, JSON boundary, typed client */
describe('panel <-> plugin integration', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>)[DEVTOOLS_HOOK_KEY];
  });

  function setup() {
    const world = new EcsWorld();
    world.registerSystem(defineSystem('init', () => {}, startup, { then: { publish: READY } }));
    world.registerSystem(defineSystem('listen', () => {}, on(READY)));
    world.use(devtoolsPlugin({ name: 'Integration' }));

    const client = new BridgeClient(new PageTransport());
    return { world, client };
  }

  it('should discover the world and describe its systems', async () => {
    const { client } = setup();

    const discovery = await client.discover();
    expect(discovery).toEqual({ status: 'ok', worlds: [{ id: 'world-1', name: 'Integration' }] });

    const { graph } = await client.world('world-1').systems();
    expect(graph.nodes.map((node) => `${node.kind}:${node.label}`).sort()).toEqual([
      'event:READY',
      'startup:startup',
      'system:init',
      'system:listen',
    ]);
  });

  it('should browse components, entities and values', async () => {
    const { world, client } = setup();
    const entity = world.entities.spawn(new Position({ x: 1, y: 2 }), new Health(5));
    const api = client.world('world-1');

    const components = await api.components();
    const health = components.types.find((type) => type.name === 'Health')!;
    expect(health).toMatchObject({ kind: 'mutable', entities: 1 });

    const page = await api.entities({ with: [health.key] });
    expect(page).toEqual({ total: 1, entities: [{ id: entity, components: expect.arrayContaining([health.key]) }] });

    const detail = await api.entity(entity);
    expect(detail?.components.find((component) => component.name === 'Health')?.value).toBe(5);

    // Mutable components: the new value is visible at the next request
    world.entities.componentOf(entity, Health)!.value = 4;
    expect((await api.entity(entity))?.components.find((c) => c.name === 'Health')?.value).toBe(4);
  });

  it('should tell when the revision of the world changes', async () => {
    const { world, client } = setup();
    const api = client.world('world-1');
    const before = (await api.info()).revision;

    world.registerSystem(defineSystem('late', () => {}, startup));

    expect((await api.info()).revision).not.toBe(before);
  });
});
