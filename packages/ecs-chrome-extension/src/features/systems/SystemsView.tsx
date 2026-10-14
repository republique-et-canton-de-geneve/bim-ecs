import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeChange,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useReadyConnection } from '../../bridge/connection-context';
import { usePolled } from '../../bridge/use-polled';
import { usePersistentState } from '../../ui/persistent-state';
import { colorOf } from '../../ui/color';
import type { Theme } from '../../ui/theme';
import { KindNode, type KindFlowNode, type NodeEmphasis } from './KindNode';
import { NodeInspector } from './NodeInspector';
import { SystemsToolbar } from './SystemsToolbar';
import { categoryOf, type NodeCategory } from './kind-meta';
import { contractGraph, matchNodes, relatedNodes, subgraph, type ViewGraph } from './graph-model';
import { layoutGraph, nodeSize, type Point } from './layout';
import { DEFAULT_SYSTEMS_SETTINGS, type SystemsSettings } from './settings';

const nodeTypes: NodeTypes = { kind: KindNode };
const EMPTY_GRAPH: ViewGraph = { nodes: [], edges: [] };

interface SystemsViewProps {
  theme: Theme;
  /** The text searched in the graph (shared so other views can point at a node) */
  search: string;
  onSearchChange: (text: string) => void;
  onShowComponent: (name: string) => void;
}

export function SystemsView(props: SystemsViewProps) {
  return (
    <ReactFlowProvider>
      <SystemsGraph {...props} />
    </ReactFlowProvider>
  );
}

function SystemsGraph({ theme, search, onSearchChange, onShowComponent }: SystemsViewProps) {
  const connection = useReadyConnection();
  const { fitView, setCenter } = useReactFlow();

  const [settings, setSettings] = usePersistentState<SystemsSettings>('systems-settings', DEFAULT_SYSTEMS_SETTINGS);
  const [pinned, setPinned] = usePersistentState<Record<string, Point>>(
    `systems-positions:${connection.world.name}`,
    {},
  );
  const [livePositions, setLivePositions] = useState<Record<string, Point>>({});
  const [selectedId, setSelectedId] = useState<string>();
  const [hoveredId, setHoveredId] = useState<string>();
  const [activeMatch, setActiveMatch] = useState(0);

  const patchSettings = useCallback(
    (patch: Partial<SystemsSettings>) => setSettings((current) => ({ ...current, ...patch })),
    [setSettings],
  );

  // The structure is only fetched when the revision of the world says it has changed
  const { data: snapshot, error } = usePolled(
    () => connection.api.systems(),
    [connection.api, connection.world.revision],
    null,
  );

  // Graph: categories hidden by the user are contracted, disposed systems can be left out
  const hidden = useMemo(() => new Set<NodeCategory>(settings.hiddenCategories), [settings.hiddenCategories]);
  const graph = useMemo<ViewGraph>(() => {
    if (!snapshot) return EMPTY_GRAPH;

    const contracted = contractGraph(snapshot.graph, hidden);
    if (settings.showDisposed) return contracted;

    return subgraph(
      contracted,
      new Set(contracted.nodes.filter((node) => !node.system?.disposed).map((node) => node.id)),
    );
  }, [snapshot, hidden, settings.showDisposed]);

  const counts = useMemo(() => {
    const result = Object.fromEntries(
      ['system', 'event', 'command', 'component', 'entity', 'trigger', 'modifier', 'other'].map((c) => [c, 0]),
    ) as Record<NodeCategory, number>;
    snapshot?.graph.nodes.forEach((node) => result[categoryOf(node.kind)]++);
    return result;
  }, [snapshot]);

  const selected = selectedId ? graph.nodes.find((node) => node.id === selectedId) : undefined;
  const focusedId = selected?.id ?? hoveredId;

  const related = useMemo(
    () => (focusedId ? relatedNodes(graph, focusedId, settings.relation) : new Set<string>()),
    [graph, focusedId, settings.relation],
  );

  // Isolation hides everything unrelated to the selection (and lays the remaining out again)
  const visible = useMemo(() => {
    if (!settings.isolate || !selected) return graph;
    return subgraph(graph, new Set([selected.id, ...relatedNodes(graph, selected.id, settings.relation)]));
  }, [graph, settings.isolate, settings.relation, selected]);

  const matches = useMemo(() => [...matchNodes(visible.nodes, search)], [visible.nodes, search]);
  const matchSet = useMemo(() => new Set(matches), [matches]);

  const layout = useMemo(
    () => layoutGraph(visible, { direction: settings.direction, density: settings.density }),
    [visible, settings.direction, settings.density],
  );

  const compact = settings.density === 'compact';

  const nodes = useMemo<KindFlowNode[]>(
    () =>
      visible.nodes.map((node) => {
        const category = categoryOf(node.kind);
        const size = nodeSize(category, settings.density);

        // What is looked at (selection, hover) is surrounded by what relates to it, the rest steps back.
        // When searching, the matches take the light instead.
        let emphasis: NodeEmphasis = 'normal';
        if (focusedId && node.id !== focusedId) emphasis = related.has(node.id) ? 'related' : 'dimmed';
        if (matchSet.size) emphasis = matchSet.has(node.id) ? 'match' : emphasis === 'related' ? 'related' : 'dimmed';

        return {
          id: node.id,
          type: 'kind',
          position: livePositions[node.id] ?? pinned[node.id] ?? layout.get(node.id) ?? { x: 0, y: 0 },
          width: size.width,
          height: size.height,
          selected: node.id === selectedId,
          data: { node, category, direction: settings.direction, emphasis, compact },
        };
      }),
    [
      visible.nodes,
      settings.density,
      settings.direction,
      matchSet,
      related,
      focusedId,
      selectedId,
      layout,
      pinned,
      livePositions,
      compact,
    ],
  );

  const edges = useMemo<Edge[]>(
    () =>
      visible.edges.map((edge) => {
        const touchesFocus = focusedId && (edge.from === focusedId || edge.to === focusedId);
        const inRelation =
          focusedId &&
          (related.has(edge.from) || edge.from === focusedId) &&
          (related.has(edge.to) || edge.to === focusedId);
        const classes = [`edge-${edge.kind}`];
        if (edge.contracted) classes.push('edge-contracted');
        if (focusedId && !inRelation) classes.push('edge-dim');
        if (touchesFocus) classes.push('edge-focus');

        return {
          id: edge.id,
          source: edge.from,
          target: edge.to,
          type: settings.edgeStyle === 'bezier' ? 'default' : settings.edgeStyle,
          className: classes.join(' '),
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: `var(--edge-${edge.kind})` },
        };
      }),
    [visible.edges, settings.edgeStyle, focusedId, related],
  );

  // Positions set by dragging are kept (and persisted) once the drag ends
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const moves = changes.flatMap((change) => (change.type === 'position' && change.position ? [change] : []));
    if (moves.length) {
      setLivePositions((current) => {
        const next = { ...current };
        for (const move of moves) next[move.id] = move.position!;
        return next;
      });
    }
  }, []);

  const handleDragStop = useCallback(
    (_: unknown, __: unknown, dragged: { id: string; position: Point }[]) => {
      setPinned((current) => ({ ...current, ...Object.fromEntries(dragged.map((node) => [node.id, node.position])) }));
      setLivePositions({});
    },
    [setPinned],
  );

  const resetLayout = useCallback(() => {
    setPinned({});
    setLivePositions({});
  }, [setPinned]);

  // The graph is fitted when its shape changes because of the user (or on first display), not on every refresh
  const hasNodes = nodes.length > 0;
  const fitKey = `${connection.worldId}|${settings.direction}|${settings.density}|${settings.hiddenCategories.join()}|${settings.isolate ? selectedId : ''}|${hasNodes}`;
  useEffect(() => {
    const frame = requestAnimationFrame(() => void fitView({ padding: 0.15, duration: 250 }));
    return () => cancelAnimationFrame(frame);
  }, [fitKey, fitView]);

  const centerOn = useCallback(
    (id: string) => {
      const position = livePositions[id] ?? pinned[id] ?? layout.get(id);
      const node = visible.nodes.find((candidate) => candidate.id === id);
      if (!position || !node) return;

      const size = nodeSize(categoryOf(node.kind), settings.density);
      void setCenter(position.x + size.width / 2, position.y + size.height / 2, { zoom: 1.1, duration: 300 });
    },
    [livePositions, pinned, layout, visible.nodes, settings.density, setCenter],
  );

  const goToNextMatch = useCallback(() => {
    if (!matches.length) return;
    const next = (activeMatch + 1) % matches.length;
    setActiveMatch(next);
    centerOn(matches[next]);
  }, [matches, activeMatch, centerOn]);

  // A new search starts from its first match
  useEffect(() => {
    setActiveMatch(0);
    if (matches.length) centerOn(matches[0]);
    // Only the text of the search must trigger it, not the graph refreshing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedId(node.id), []);
  const handleEnter: NodeMouseHandler = useCallback((_, node) => setHoveredId(node.id), []);
  const handleLeave: NodeMouseHandler = useCallback(() => setHoveredId(undefined), []);

  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      centerOn(id);
    },
    [centerOn],
  );

  return (
    <div className="systems">
      <SystemsToolbar
        settings={settings}
        onChange={patchSettings}
        search={search}
        onSearch={onSearchChange}
        matchCount={matches.length}
        activeMatch={activeMatch}
        onNextMatch={goToNextMatch}
        onFit={() => void fitView({ padding: 0.15, duration: 250 })}
        onResetLayout={resetLayout}
        pinnedCount={Object.keys(pinned).length}
        counts={counts}
      />

      <div className="canvas">
        {error && <div className="banner banner-error">{error}</div>}
        {snapshot && !snapshot.graph.nodes.length && (
          <div className="empty">No system registered in this world yet.</div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={theme}
          onNodesChange={handleNodesChange}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleEnter}
          onNodeMouseLeave={handleLeave}
          onNodeDragStop={handleDragStop}
          onPaneClick={() => setSelectedId(undefined)}
          nodesConnectable={false}
          deleteKeyCode={null}
          minZoom={0.1}
          maxZoom={2}
          fitView
        >
          <Background gap={22} />
          <Controls showInteractive={false} />
          {settings.minimap && (
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => minimapColor((node as KindFlowNode).data)}
              maskColor="var(--minimap-mask)"
            />
          )}
        </ReactFlow>

        {selected && (
          <NodeInspector
            node={selected}
            graph={graph}
            onSelect={select}
            onClose={() => setSelectedId(undefined)}
            onShowComponent={onShowComponent}
          />
        )}
      </div>
    </div>
  );
}

function minimapColor(data: KindFlowNode['data']) {
  return data.category === 'component' ? colorOf(data.node.label) : `var(--cat-${data.category})`;
}
