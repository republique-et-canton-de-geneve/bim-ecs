import type { SchedulerDescriptor, SystemDescriptor } from '@state-of-geneva/bim-ecs';
import type { GraphEdge, GraphEdgeKind, GraphNode, SystemsGraph } from './protocol';

/** Kinds of schedulers whose nodes are shared: every system bound to the same thing is connected to the same node */
const SHARED_KINDS = new Set([
  'startup',
  'frame',
  'component-added',
  'component-removed',
  'component-value-changed',
  'entity-spawned',
  'entity-removed',
]);

/**
 * Builds the systems graph from the systems descriptors.
 *
 * - Events, commands, components and queries are shared nodes, so the graph shows which systems react to the same thing
 * - Modifiers (`when`, `debounce`...) are private to the system they belong to
 * - The result only depends on the descriptors: registration order does not matter
 * @param systems The systems descriptors
 */
export function buildSystemsGraph(systems: readonly SystemDescriptor[]): SystemsGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();

  const systemNodeId = (id: number) => `system:${id}`;

  const addNode = (node: GraphNode) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
    return node.id;
  };

  const link = (from: string, to: string, kind: GraphEdgeKind) => {
    const id = `${from}>${to}:${kind}`;
    if (!edges.has(id)) edges.set(id, { id, from, to, kind });
  };

  /** Provides the node of a system, a placeholder is created when the system is not registered */
  const systemNode = (id: number) =>
    addNode({ id: systemNodeId(id), kind: 'system', label: `#${id}`, detail: 'not registered' });

  const addScheduler = (descriptor: SchedulerDescriptor, parent: string, path: string) => {
    switch (descriptor.kind) {
      case 'on':
      case 'at-command': {
        // One node per bound event / command
        const kind = descriptor.kind === 'on' ? 'event' : 'command';
        for (const label of descriptor.labels ?? []) {
          link(addNode({ id: `${kind}:${label}`, kind, label }), parent, 'schedule');
        }
        return;
      }

      case 'after': {
        const upstream = (descriptor.systems ?? []).map(systemNode);
        if (upstream.length === 1) {
          link(upstream[0], parent, 'after');
        } else {
          const junction = addNode({ id: path, kind: 'after', label: String(descriptor.params?.combination ?? 'or') });
          for (const source of upstream) link(source, junction, 'after');
          link(junction, parent, 'schedule');
        }
        return;
      }

      default: {
        const detail = descriptor.without?.length ? `without ${descriptor.without.join(', ')}` : undefined;
        const label = labelOf(descriptor);
        const id = SHARED_KINDS.has(descriptor.kind)
          ? `${descriptor.kind}:${label}${detail ? `|${detail}` : ''}`
          : path;

        const node = addNode({ id, kind: descriptor.kind, label, ...(detail && { detail }) });
        link(node, parent, 'schedule');
        descriptor.children?.forEach((child, index) => addScheduler(child, node, `${path}/${index}`));
      }
    }
  };

  // System nodes come first: placeholders are only created for missing upstream systems
  for (const system of systems) {
    addNode({
      id: systemNodeId(system.id),
      kind: 'system',
      label: system.name,
      system: { id: system.id, running: system.running, disposed: system.disposed },
    });
  }

  for (const system of systems) {
    const node = systemNodeId(system.id);
    addScheduler(system.scheduler, node, `${node}/scheduler`);

    if (system.then?.publish) {
      link(node, addNode({ id: `event:${system.then.publish}`, kind: 'event', label: system.then.publish }), 'publish');
    }
    if (system.then?.trigger) {
      link(
        node,
        addNode({ id: `command:${system.then.trigger}`, kind: 'command', label: system.then.trigger }),
        'trigger',
      );
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

/** Provides the name of the scheduler thing */
function labelOf({ kind, labels, params }: SchedulerDescriptor) {
  if (labels?.length) return labels.join(', ');

  switch (kind) {
    case 'timer':
    case 'debounce':
      return `${params?.delay ?? '?'}ms`;
    case 'when':
      return String(params?.predicate ?? kind);
    default:
      return kind;
  }
}
