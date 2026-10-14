import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '@bim-ecs/devtools-protocol';
import { colorOf } from '../../ui/color';
import { titleOf, type NodeCategory } from './kind-meta';
import type { Direction } from './layout';

/** How a node relates to what the user is looking at */
export type NodeEmphasis = 'normal' | 'dimmed' | 'related' | 'match';

export interface KindNodeData extends Record<string, unknown> {
  node: GraphNode;
  category: NodeCategory;
  direction: Direction;
  emphasis: NodeEmphasis;
  compact: boolean;
}

export type KindFlowNode = Node<KindNodeData, 'kind'>;

/** The single node renderer of the graph: styling follows the category of the node */
export const KindNode = memo(function KindNode({ data, selected }: NodeProps<KindFlowNode>) {
  const { node, category, direction, emphasis, compact } = data;
  const isSystem = node.kind === 'system';
  const state = node.system?.disposed ? 'disposed' : node.system?.running ? 'running' : 'idle';

  // Component types keep the color they have in the components view
  const accent = category === 'component' ? { borderLeftColor: colorOf(node.label) } : undefined;

  const classes = [
    'kn',
    `kn-${category}`,
    `kn-${emphasis}`,
    compact && 'kn-compact',
    selected && 'kn-selected',
    isSystem && `kn-state-${state}`,
    isSystem && !node.system && 'kn-missing',
  ];

  return (
    <div className={classes.filter(Boolean).join(' ')} style={accent} title={tooltipOf(node)}>
      <Handle type="target" position={direction === 'LR' ? Position.Left : Position.Top} isConnectable={false} />
      <div className="kn-title">
        {isSystem && <span className={`kn-dot kn-dot-${state}`} />}
        {titleOf(node.kind)}
      </div>
      <div className="kn-label">{node.label}</div>
      {node.detail && !compact && <div className="kn-detail">{node.detail}</div>}
      <Handle type="source" position={direction === 'LR' ? Position.Right : Position.Bottom} isConnectable={false} />
    </div>
  );
});

function tooltipOf(node: GraphNode) {
  const lines = [`${titleOf(node.kind)}: ${node.label}`];
  if (node.detail) lines.push(node.detail);
  if (node.system) {
    lines.push(`System #${node.system.id}`);
    lines.push(node.system.disposed ? 'Disposed' : node.system.running ? 'Running' : 'Not running');
  }
  return lines.join('\n');
}
