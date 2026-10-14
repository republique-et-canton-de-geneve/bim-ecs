import { useState } from 'react';
import { useReadyConnection } from '../../bridge/connection-context';
import { usePolled } from '../../bridge/use-polled';
import { ValueTree } from '../../ui/ValueTree';

interface ResourcesViewProps {
  refreshMs: number | null;
}

export function ResourcesView({ refreshMs }: ResourcesViewProps) {
  const { api } = useReadyConnection();
  const [selectedKey, setSelectedKey] = useState<string>();

  const { data: resources, error } = usePolled(() => api.resources(), [api], refreshMs);
  const { data: detail } = usePolled(
    selectedKey === undefined ? undefined : () => api.resource(selectedKey),
    [api, selectedKey],
    refreshMs,
  );

  if (error && !resources) return <div className="banner banner-error">{error}</div>;
  if (!resources) return <div className="empty">Loading…</div>;

  return (
    <div className="resources">
      <section className="panel">
        <header>
          <h3>Resources</h3>
          <span className="muted">{resources.length}</span>
        </header>
        <ul className="scroll">
          {resources.map((resource) => (
            <li key={resource.key}>
              <button
                type="button"
                className={`row ${resource.key === selectedKey ? 'selected' : ''}`}
                onClick={() => setSelectedKey(resource.key)}
              >
                {resource.name}
              </button>
            </li>
          ))}
          {!resources.length && <li className="muted pad">No resource registered.</li>}
        </ul>
      </section>

      <section className="panel">
        <header>
          <h3>{detail?.name ?? 'Value'}</h3>
        </header>
        <div className="scroll">
          {selectedKey === undefined && <div className="muted pad">Select a resource to inspect its value.</div>}
          {selectedKey !== undefined && detail === null && (
            <div className="muted pad">This resource does not exist anymore.</div>
          )}
          {detail && <ValueTree value={detail.value} expandedDepth={2} />}
        </div>
      </section>
    </div>
  );
}
