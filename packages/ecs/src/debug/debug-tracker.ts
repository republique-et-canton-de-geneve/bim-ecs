import type { EcsWorld } from '../world';
import {
  DEBUG_NAME,
  type Debuggable,
  DEBUG_DEPENDENCIES,
  DEBUG_TYPE,
  DEBUG_ID,
  type DebuggableSingle,
  DEBUG_DEPENDENTS,
} from './debuggable';

export class DebugTracker {
  constructor(private readonly world: EcsWorld) {}

  public readonly graph = new Set<string>();
  public mermaidGraph: string | undefined;

  public data: any;

  public track(debuggable: Debuggable) {
    const dependencies = debuggable[DEBUG_DEPENDENCIES]?.filter((dep) => dep?.[DEBUG_NAME]) ?? ([] as Debuggable[]);
    for (const dep of dependencies) {
      const id = dep[DEBUG_ID];
      if (Array.isArray(id)) {
        for (let i = 0; i < id.length; i++) {
          this.graph.add(
            `${renderNode({
              [DEBUG_NAME]: dep[DEBUG_NAME][i],
              [DEBUG_TYPE]: dep[DEBUG_TYPE],
              [DEBUG_ID]: dep[DEBUG_ID][i],
              [DEBUG_DEPENDENCIES]: dep[DEBUG_DEPENDENCIES],
              [DEBUG_DEPENDENTS]: dep[DEBUG_DEPENDENTS],
            } satisfies Debuggable)}-->${renderNode(debuggable as DebuggableSingle)}`,
          );
        }
      } else {
        this.graph.add(`${renderNode(dep as DebuggableSingle)}-->${renderNode(debuggable as DebuggableSingle)}`);
      }

      this.track(dep);
    }

    const dependents = debuggable[DEBUG_DEPENDENTS]?.filter((dep) => dep?.[DEBUG_NAME]) as Debuggable[];
    if (dependents) {
      for (const dependent of dependents) {
        this.graph.add(`${renderNode(debuggable as DebuggableSingle)}-->${renderNode(dependent as DebuggableSingle)}`);
      }
    }

    function renderNode(debuggable: DebuggableSingle) {
      const name = debuggable[DEBUG_NAME];
      const type = debuggable[DEBUG_TYPE];
      const id = debuggable[DEBUG_ID];

      return `${id.replaceAll(/\s/g, '_')}(["${type} ${name}"])`;
    }
  }

  public render() {
    this.mermaidGraph = `flowchart LR\n${[...this.graph.values()].join('\n')}`;
    this.data = JSON.stringify({
      mermaidGraph: this.mermaidGraph,
      resources: [], // this.world.container.getAll(),
    });
    (window as any).__ecs_debug = this;
  }
}
