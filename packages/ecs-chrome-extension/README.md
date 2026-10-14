# BIM ECS DevTools

Chrome DevTools extension to inspect [bim-ecs](../ecs) worlds: **systems graph**, **components & entities**, **resources**.

It talks to the page through [`@state-of-geneva/bim-ecs-devtools-plugin`](../ecs-devtools-plugin): the world must install it.

```typescript
world.use(devtoolsPlugin({ name: 'My game' }));
```

## Use it

```sh
pnpm build            # from this folder: type check + production build into ./dist
```

Then open `chrome://extensions`, enable *Developer mode*, *Load unpacked* and select `packages/ecs-chrome-extension/dist`. A new **ECS** panel appears in the DevTools of every page.

## Features

### Systems

- Interactive graph (pan, zoom, minimap, drag nodes: positions are remembered, *Reset layout* forgets them)
- Systems, events, commands, components, entity queries, triggers and modifiers are distinct nodes; events and commands are shared, so you see which systems react to the same thing
- **Hide a category** with its chip: its nodes are removed but what they connect is kept (hide events to see "which system triggers which")
- **Search** nodes by name, kind or detail; *Enter* jumps to the next match
- **Select / hover** a node to highlight what leads to it and what it leads to (upstream, downstream, both or neighbours only); *Isolate* shows only that
- Inspector with the connections of the selected node, to navigate through the graph
- Layout direction, edge style, density, disposed systems and minimap are customizable (persisted)

### Components

- Component types with their number of entities, and the archetypes (distinct sets of components) with their share of entities
- Click a type to require it, again to exclude it; click an archetype to select exactly its components
- Paged entities list, and an entity inspector showing the value of each component (kept up to date, mutable components included)
- *in systems* / *Show in components* link both views

### Resources

The registered resources and their values, loaded when selected.

## Develop

```sh
pnpm dev              # http://localhost:5173/harness.html
pnpm test             # unit tests (vitest)
pnpm typecheck
```

The **harness** runs the panel in a regular page against a real world instrumented by the real plugin (the data goes through the same JSON boundary as in the extension), with some life: components change, entities come and go, systems can be registered or the world disposed from the harness bar. No Chrome extension reload is needed while developing the UI.

Workspace sources (`bim-ecs`, the plugin, the protocol) are aliased to their TypeScript sources in `vite.config.ts` and `tsconfig.json`: the panel never depends on the build order of other packages.

## How it works

```
 inspected page                                   DevTools panel (this package)
┌────────────────────────────┐                   ┌───────────────────────────────────┐
│ world + devtoolsPlugin     │                   │ Transport      evaluates in the   │
│  └ globalThis             ◄├── eval(JSON) ─────┤  (chrome / page) inspected page   │
│    .__BIM_ECS_DEVTOOLS__   │                   │ BridgeClient   typed API          │
└────────────────────────────┘                   │ ConnectionStore discovery, polling│
                                                 │ features/*     React views        │
                                                 └───────────────────────────────────┘
```

- `src/bridge`: transports, typed client and the connection state machine (discovery, polling, reconnection after navigation or world disposal). No React.
- `src/features`: one folder per tab; `systems/graph-model.ts` and `layout.ts` are pure and unit tested.
- The panel is polite with the page: nothing is requested while the panel is hidden, the state of the world is a cheap poll, and the structure is only fetched again when its `revision` changes.

## Troubleshooting

| Symptom | Reason |
| --- | --- |
| *No BIM ECS world found* | `devtoolsPlugin` is not installed, or the page has not loaded it yet (the panel keeps looking) |
| *Incompatible versions* | The page and the extension speak different protocol versions: update the plugin or the extension |
| Component names look mangled | Names come from class names: minified builds mangle them |
