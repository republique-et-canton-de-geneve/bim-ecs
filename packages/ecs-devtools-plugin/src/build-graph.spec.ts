import { describe, it, expect } from 'vitest';
import {
  after,
  atCommand,
  compose,
  debounce,
  defineSystem,
  EcsComponent,
  EcsWorld,
  frame,
  on,
  startup,
  spawned,
  when,
  componentAdded,
  type EcsCommand,
  type EcsEvent,
  type SystemDefinition,
} from '@state-of-geneva/bim-ecs';
import { buildSystemsGraph } from './build-graph';
import type { SystemsGraph } from './protocol';

const SOMETHING_HAPPENED = Symbol('SOMETHING_HAPPENED') as EcsEvent<number>;
const DO_SOMETHING = Symbol('DO_SOMETHING') as EcsCommand<number>;

function graphOf(...systems: SystemDefinition<any>[]) {
  const world = new EcsWorld();
  systems.forEach((system) => world.registerSystem(system));
  return buildSystemsGraph(world.systems.describe());
}

/** Compact, order independent representation of the graph relations */
function relations(graph: SystemsGraph) {
  const label = new Map(graph.nodes.map((node) => [node.id, `${node.kind}:${node.label}`]));
  return graph.edges.map((edge) => `${label.get(edge.from)} -${edge.kind}-> ${label.get(edge.to)}`).sort();
}

describe('buildSystemsGraph', () => {
  it('should share event nodes between publishers and listeners', () => {
    const producer = defineSystem('producer', () => 1, startup, { then: { publish: SOMETHING_HAPPENED } });
    const first = defineSystem('first', () => {}, on(SOMETHING_HAPPENED));
    const second = defineSystem('second', () => {}, on(SOMETHING_HAPPENED));

    const graph = graphOf(producer, first, second);

    expect(graph.nodes.filter((node) => node.kind === 'event')).toHaveLength(1);
    expect(relations(graph)).toEqual([
      'event:SOMETHING_HAPPENED -schedule-> system:first',
      'event:SOMETHING_HAPPENED -schedule-> system:second',
      'startup:startup -schedule-> system:producer',
      'system:producer -publish-> event:SOMETHING_HAPPENED',
    ]);
  });

  it('should link commands triggered and listened', () => {
    const trigger = defineSystem('trigger', () => 1, frame, { then: { trigger: DO_SOMETHING } });
    const handler = defineSystem('handler', () => {}, atCommand(DO_SOMETHING));

    expect(relations(graphOf(trigger, handler))).toEqual([
      'command:DO_SOMETHING -schedule-> system:handler',
      'frame:frame -schedule-> system:trigger',
      'system:trigger -trigger-> command:DO_SOMETHING',
    ]);
  });

  it('should link a single upstream system directly', () => {
    const first = defineSystem('first', () => {}, startup);
    const second = defineSystem('second', () => {}, after(first));

    expect(relations(graphOf(first, second))).toEqual([
      'startup:startup -schedule-> system:first',
      'system:first -after-> system:second',
    ]);
  });

  it('should join several upstream systems through a node stating the combination', () => {
    const first = defineSystem('first', () => {}, startup);
    const second = defineSystem('second', () => {}, startup);
    const third = defineSystem('third', () => {}, after([first, second], { combination: 'and' }));

    expect(relations(graphOf(first, second, third))).toEqual([
      'after:and -schedule-> system:third',
      'startup:startup -schedule-> system:first',
      'startup:startup -schedule-> system:second',
      'system:first -after-> after:and',
      'system:second -after-> after:and',
    ]);
  });

  it('should not depend on the registration order', () => {
    const first = defineSystem('first', () => 1, startup, { then: { publish: SOMETHING_HAPPENED } });
    const second = defineSystem('second', () => {}, after(first));
    const third = defineSystem('third', () => {}, on(SOMETHING_HAPPENED));

    expect(relations(graphOf(first, second, third))).toEqual(relations(graphOf(third, second, first)));
    expect(relations(graphOf(third, second, first))).toContain('system:first -after-> system:second');
  });

  it('should create a placeholder for an upstream system which is not registered', () => {
    const missing = defineSystem('missing', () => {}, startup);
    const downstream = defineSystem('downstream', () => {}, after(missing));

    const graph = graphOf(downstream);
    const placeholder = graph.nodes.find((node) => node.detail === 'not registered');

    expect(placeholder).toMatchObject({ kind: 'system' });
    expect(placeholder?.system).toBeUndefined();
    expect(graph.edges.map((edge) => edge.from)).toContain(placeholder!.id);
  });

  it('should keep modifiers private and chain them from the source to the system', () => {
    const isEven = () => (data: { payload: number }) => data.payload % 2 === 0;
    const first = defineSystem('first', () => {}, when(isEven, debounce(on(SOMETHING_HAPPENED), 100)));
    const second = defineSystem('second', () => {}, when(isEven, on(SOMETHING_HAPPENED)));

    const graph = graphOf(first, second);

    expect(graph.nodes.filter((node) => node.kind === 'when')).toHaveLength(2);
    expect(relations(graph)).toEqual([
      'debounce:100ms -schedule-> when:isEven',
      'event:SOMETHING_HAPPENED -schedule-> debounce:100ms',
      'event:SOMETHING_HAPPENED -schedule-> when:isEven',
      'when:isEven -schedule-> system:first',
      'when:isEven -schedule-> system:second',
    ]);
  });

  it('should aggregate composed schedulers', () => {
    const system = defineSystem('system', () => {}, compose(startup, on(SOMETHING_HAPPENED)));

    expect(relations(graphOf(system))).toEqual([
      'compose:compose -schedule-> system:system',
      'event:SOMETHING_HAPPENED -schedule-> compose:compose',
      'startup:startup -schedule-> compose:compose',
    ]);
  });

  it('should share component and query nodes, stating the excluded components', () => {
    class Brick extends EcsComponent {}
    class Frozen extends EcsComponent {}

    const first = defineSystem('first', () => {}, componentAdded(Brick));
    const second = defineSystem('second', () => {}, componentAdded(Brick));
    const third = defineSystem(
      'third',
      () => {},
      spawned(({ without }) => [Brick, without(Frozen)]),
    );

    const graph = graphOf(first, second, third);

    expect(graph.nodes.filter((node) => node.kind === 'component-added')).toHaveLength(1);
    expect(graph.nodes.find((node) => node.kind === 'entity-spawned')).toMatchObject({
      label: 'Brick',
      detail: 'without Frozen',
    });
  });

  it('should state the running state of systems', () => {
    const system = defineSystem('system', () => {}, frame);
    const world = new EcsWorld().registerSystem(system);

    expect(buildSystemsGraph(world.systems.describe()).nodes[0].system).toEqual({
      id: expect.any(Number),
      running: false,
      disposed: false,
    });
  });
});
