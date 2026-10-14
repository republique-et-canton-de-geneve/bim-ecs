import type { Density, Direction } from './layout';
import type { NodeCategory } from './kind-meta';
import type { RelationMode } from './graph-model';

export type EdgeStyle = 'bezier' | 'smoothstep' | 'straight';

/** How the systems graph is displayed (persisted) */
export interface SystemsSettings {
  direction: Direction;
  density: Density;
  edgeStyle: EdgeStyle;
  /** Categories whose nodes are hidden (connections are kept) */
  hiddenCategories: NodeCategory[];
  /** What is highlighted around the selected / hovered node */
  relation: RelationMode;
  /** Only displays the selected node and what is related to it */
  isolate: boolean;
  /** Displays systems which have been disposed (e.g. startup systems once executed) */
  showDisposed: boolean;
  minimap: boolean;
}

export const DEFAULT_SYSTEMS_SETTINGS: SystemsSettings = {
  direction: 'LR',
  density: 'comfortable',
  edgeStyle: 'smoothstep',
  hiddenCategories: [],
  relation: 'all',
  isolate: false,
  showDisposed: true,
  minimap: true,
};
