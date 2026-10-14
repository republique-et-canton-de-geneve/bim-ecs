/** Families of graph nodes: what the user shows, hides and styles */
export type NodeCategory = 'system' | 'event' | 'command' | 'component' | 'entity' | 'trigger' | 'modifier' | 'other';

export const CATEGORIES: ReadonlyArray<{ id: NodeCategory; title: string; hint: string }> = [
  { id: 'system', title: 'Systems', hint: 'The systems registered in the world' },
  { id: 'event', title: 'Events', hint: 'Events published on the bus' },
  { id: 'command', title: 'Commands', hint: 'Commands triggered and handled by systems' },
  { id: 'component', title: 'Components', hint: 'Component added / removed / value changed' },
  { id: 'entity', title: 'Entities', hint: 'Entity spawned / removed' },
  { id: 'trigger', title: 'Triggers', hint: 'Startup, frame and timer' },
  { id: 'modifier', title: 'Modifiers', hint: 'when, debounce, compose and after junctions' },
  { id: 'other', title: 'Custom', hint: 'Custom schedulers' },
];

const CATEGORY_BY_KIND: Record<string, NodeCategory> = {
  system: 'system',
  event: 'event',
  command: 'command',
  'component-added': 'component',
  'component-removed': 'component',
  'component-value-changed': 'component',
  'entity-spawned': 'entity',
  'entity-removed': 'entity',
  startup: 'trigger',
  frame: 'trigger',
  timer: 'trigger',
  when: 'modifier',
  debounce: 'modifier',
  'debounce-frame': 'modifier',
  compose: 'modifier',
  after: 'modifier',
};

/** Unknown kinds (e.g. coming from a newer plugin) are tolerated: they fall in `other` */
export function categoryOf(kind: string): NodeCategory {
  return CATEGORY_BY_KIND[kind] ?? 'other';
}

const TITLES: Record<string, string> = {
  system: 'System',
  event: 'Event',
  command: 'Command',
  'component-added': 'Component added',
  'component-removed': 'Component removed',
  'component-value-changed': 'Component changed',
  'entity-spawned': 'Entity spawned',
  'entity-removed': 'Entity removed',
  startup: 'Startup',
  frame: 'Frame',
  timer: 'Timer',
  when: 'When',
  debounce: 'Debounce',
  'debounce-frame': 'Debounce frame',
  compose: 'Compose',
  after: 'After',
  custom: 'Custom',
};

export function titleOf(kind: string) {
  return TITLES[kind] ?? kind;
}
