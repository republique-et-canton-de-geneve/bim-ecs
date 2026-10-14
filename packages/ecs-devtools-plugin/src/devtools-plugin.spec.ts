import { beforeEach, describe, expect, it } from 'vitest';
import {
  defineSystem,
  EcsComponent,
  EcsResource,
  EcsWorld,
  on,
  startup,
  type EcsEvent,
  type EcsResourceKey,
} from '@state-of-geneva/bim-ecs';
import { devtoolsPlugin } from './devtools-plugin';
import {
  DEVTOOLS_HOOK_KEY,
  DEVTOOLS_PROTOCOL_VERSION,
  type DevtoolsCallResult,
  type DevtoolsHook,
  type WorldState,
} from './protocol';

const hook = () => (globalThis as Record<string, any>)[DEVTOOLS_HOOK_KEY] as DevtoolsHook;

/** Calls the hook as a consumer evaluating code in the page does, results must survive a JSON round trip */
function call<T>(worldId: string, method: Parameters<DevtoolsHook['call']>[1], ...args: unknown[]) {
  const result = hook().call(worldId, method, args) as DevtoolsCallResult<T>;
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  return result;
}

describe('devtoolsPlugin', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, any>)[DEVTOOLS_HOOK_KEY];
  });

  it('should register the world on the hook', () => {
    const world = new EcsWorld();
    world.use(devtoolsPlugin({ name: 'My game' }));

    expect(hook().protocol).toBe(DEVTOOLS_PROTOCOL_VERSION);
    expect(hook().worlds()).toEqual([{ id: 'world-1', name: 'My game' }]);
  });

  it('should name worlds by default and keep them apart', () => {
    new EcsWorld().use(devtoolsPlugin());
    new EcsWorld().use(devtoolsPlugin());

    expect(hook().worlds()).toEqual([
      { id: 'world-1', name: 'World 1' },
      { id: 'world-2', name: 'World 2' },
    ]);
  });

  it('should not register a world twice', () => {
    const world = new EcsWorld();
    const first = world.use(devtoolsPlugin());
    const second = world.use(devtoolsPlugin());

    expect(second).toBe(first);
    expect(hook().worlds()).toHaveLength(1);
  });

  it('should unregister the world when disposed', () => {
    const world = new EcsWorld();
    world.use(devtoolsPlugin());

    world[Symbol.dispose]();

    expect(hook().worlds()).toEqual([]);
  });

  it('should describe the systems whenever they are registered', () => {
    const EVENT = Symbol('EVENT') as EcsEvent<number>;
    const world = new EcsWorld();
    world.use(devtoolsPlugin());

    world.registerSystem(defineSystem('producer', () => 1, startup, { then: { publish: EVENT } }));
    world.registerSystem(defineSystem('consumer', () => {}, on(EVENT)));

    const result = call<any>('world-1', 'systems') as { ok: true; value: any };
    expect(result.value.graph.nodes.map((node: any) => `${node.kind}:${node.label}`).sort()).toEqual([
      'event:EVENT',
      'startup:startup',
      'system:consumer',
      'system:producer',
    ]);
  });

  it('should change the revision when the systems structure or state changes', () => {
    const world = new EcsWorld();
    world.use(devtoolsPlugin());
    const revision = () => (call<WorldState>('world-1', 'info') as { ok: true; value: WorldState }).value.revision;

    const initial = revision();
    expect(revision()).toBe(initial);

    world.registerSystem(defineSystem('system', () => {}, on(Symbol('EVENT') as EcsEvent<void>)));
    const registered = revision();
    expect(registered).not.toBe(initial);

    world.run();
    expect(revision()).not.toBe(registered);
  });

  it('should provide world state', () => {
    const world = new EcsWorld();
    world.use(devtoolsPlugin());
    world.registerSystem(defineSystem('system', () => {}, startup));
    world.entities.spawn(new (class Foo extends EcsComponent {})());

    expect(call('world-1', 'info')).toEqual({
      ok: true,
      value: { id: 'world-1', name: 'World 1', running: false, revision: expect.any(Number), systems: 1, entities: 1 },
    });
  });

  it('should inspect components and entities', () => {
    class Foo extends EcsComponent<number> {}
    const world = new EcsWorld();
    world.use(devtoolsPlugin());
    const entity = world.entities.spawn(new Foo(5));

    const components = call<any>('world-1', 'components') as { ok: true; value: any };
    const page = call<any>('world-1', 'entities', { with: [components.value.types[0].key] }) as {
      ok: true;
      value: any;
    };
    const detail = call<any>('world-1', 'entity', entity) as { ok: true; value: any };

    expect(components.value.types).toEqual([{ key: expect.any(String), name: 'Foo', kind: 'component', entities: 1 }]);
    expect(page.value).toEqual({ total: 1, entities: [{ id: entity, components: [components.value.types[0].key] }] });
    expect(detail.value.components[0]).toMatchObject({ name: 'Foo', value: 5 });
  });

  it('should list resources and serialize them lazily', () => {
    class Settings extends EcsResource {
      volume = 11;
    }
    const world = new EcsWorld([new Settings()]);
    world.container.register(Symbol('LEVEL') as EcsResourceKey<number>, 3);
    world.use(devtoolsPlugin());

    const list = call<any>('world-1', 'resources') as { ok: true; value: any[] };
    expect(list.value.map((resource) => resource.name)).toEqual(['Settings', 'LEVEL']);

    const settings = call<any>('world-1', 'resource', list.value[0].key) as { ok: true; value: any };
    expect(settings.value).toMatchObject({ name: 'Settings', value: { $: 'object', cls: 'Settings' } });
  });

  it('should report errors as data', () => {
    new EcsWorld().use(devtoolsPlugin());

    expect(hook().call('world-99', 'info')).toEqual({ ok: false, error: 'Unknown world "world-99"' });
    expect(hook().call('world-1', 'dispose' as any)).toEqual({ ok: false, error: 'Unknown method "dispose"' });
  });
});
