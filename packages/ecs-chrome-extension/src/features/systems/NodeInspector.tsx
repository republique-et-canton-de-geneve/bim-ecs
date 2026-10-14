import type { GraphNode } from '@bim-ecs/devtools-protocol';
import { colorOf } from '../../ui/color';
import { categoryOf, titleOf } from './kind-meta';
import type { ViewGraph } from './graph-model';

interface NodeInspectorProps {
  node: GraphNode;
  graph: ViewGraph;
  onSelect: (id: string) => void;
  onClose: () => void;
  /** Provided for component nodes: shows the component in the components view */
  onShowComponent?: (name: string) => void;
}

/** Details of the selected node, with its connections as navigation */
export function NodeInspector({ node, graph, onSelect, onClose, onShowComponent }: NodeInspectorProps) {
  const byId = new Map(graph.nodes.map((candidate) => [candidate.id, candidate]));
  const sources = graph.edges.filter((edge) => edge.to === node.id);
  const targets = graph.edges.filter((edge) => edge.from === node.id);
  const category = categoryOf(node.kind);

  return (
    <aside className="inspector">
      <header>
        <div>
          <div className="muted">{titleOf(node.kind)}</div>
          <h3 title={node.label}>{node.label}</h3>
        </div>
        <button type="button" className="btn icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      {node.system && (
        <dl>
          <dt>Identifier</dt>
          <dd>#{node.system.id}</dd>
          <dt>State</dt>
          <dd>{node.system.disposed ? 'Disposed' : node.system.running ? 'Running' : 'Not running'}</dd>
        </dl>
      )}
      {node.kind === 'system' && !node.system && <p className="muted">This system is not registered in the world.</p>}
      {node.detail && node.kind !== 'system' && <p className="muted">{node.detail}</p>}

      {category === 'component' && onShowComponent && (
        <button type="button" className="btn" onClick={() => onShowComponent(node.label)}>
          Show in components
        </button>
      )}

      <Connections
        title="Comes from"
        edges={sources.map((edge) => ({ edge, node: byId.get(edge.from) }))}
        onSelect={onSelect}
      />
      <Connections
        title="Leads to"
        edges={targets.map((edge) => ({ edge, node: byId.get(edge.to) }))}
        onSelect={onSelect}
      />
    </aside>
  );
}

/** Component types keep the color they have in the components view, other nodes the color of their category */
function dotColorOf(node: GraphNode) {
  const category = categoryOf(node.kind);
  return category === 'component' ? colorOf(node.label) : `var(--cat-${category})`;
}

function Connections(props: {
  title: string;
  edges: { edge: ViewGraph['edges'][number]; node: GraphNode | undefined }[];
  onSelect: (id: string) => void;
}) {
  if (!props.edges.length) return null;

  return (
    <section>
      <h4>{props.title}</h4>
      <ul>
        {props.edges.map(({ edge, node }) =>
          node ? (
            <li key={edge.id}>
              <button type="button" className="link" onClick={() => props.onSelect(node.id)}>
                <span className="cat-dot" style={{ background: dotColorOf(node) }} />
                {node.label}
              </button>
              <span className="muted">
                {titleOf(node.kind)}
                {edge.kind !== 'schedule' ? ` · ${edge.kind}` : ''}
                {edge.contracted ? ' · indirect' : ''}
              </span>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}
