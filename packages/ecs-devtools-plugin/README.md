# @state-of-geneva/bim-ecs-devtools-plugin

[bim-ecs](https://www.npmjs.com/package/@state-of-geneva/bim-ecs) plugin exposing a world to developer tools: the systems graph, the components, the entities and the resources.

It is **tool agnostic**: it publishes plain JSON through a global hook, it knows nothing about how the data is displayed. The BIM ECS DevTools extension (`packages/ecs-chrome-extension` of the repository) is one consumer; an in-page overlay or a test could be others.

## Usage

```typescript
import { EcsWorld } from '@state-of-geneva/bim-ecs';
import { devtoolsPlugin } from '@state-of-geneva/bim-ecs-devtools-plugin';

const world = new EcsWorld();
// ...systems, plugins...

world.use(devtoolsPlugin({ name: 'My game' }));
world.run();
```

Install it for development builds only:

```typescript
if (import.meta.env.DEV) world.use(devtoolsPlugin());
```

## Cost

Nothing is computed until a tool asks. While nobody does, the only runtime cost is a counter bumped when a system is registered or disposed, and when the world starts or stops. Systems processing, entities and queries are never instrumented.

Requests are answered on demand, with a bounded cost:

| Request | Cost |
| --- | --- |
| `info` | O(archetypes) |
| `systems` | O(systems + schedulers) |
| `components` | O(archetypes) |
| `entities` | O(archetypes + page size) |
| `entity`, `resource` | bounded by the serializer limits (depth, entries, nodes) |

## The hook

The plugin registers the worlds on `globalThis.__BIM_ECS_DEVTOOLS__`:

```typescript
hook.protocol;                                  // version of the contract
hook.worlds();                                  // [{ id, name }]
hook.call(worldId, 'systems');                  // { ok: true, value } | { ok: false, error }
```

Every value is JSON-safe: results can be read from another context (e.g. `chrome.devtools.inspectedWindow.eval`). The contract is documented by the types of [`src/protocol.ts`](./src/protocol.ts), which are exported by the package.

`world.use(devtoolsPlugin())` returns the bridge answering to tools, which exposes the same methods directly (useful for tests and custom transports).
