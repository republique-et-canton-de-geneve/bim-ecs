import { useCallback, useState } from 'react';
import { DEVTOOLS_HOOK_KEY } from '@bim-ecs/devtools-protocol';
import { useConnection, useConnectionStore } from '../bridge/connection-context';
import { usePersistentState } from '../ui/persistent-state';
import type { Theme } from '../ui/theme';
import { SystemsView } from '../features/systems/SystemsView';
import { ComponentsView } from '../features/components/ComponentsView';
import { ResourcesView } from '../features/resources/ResourcesView';

type Tab = 'systems' | 'components' | 'resources';

const TABS: ReadonlyArray<{ id: Tab; title: string }> = [
  { id: 'systems', title: 'Systems' },
  { id: 'components', title: 'Components' },
  { id: 'resources', title: 'Resources' },
];

const REFRESH_OPTIONS: ReadonlyArray<{ value: number | null; title: string }> = [
  { value: 250, title: '250 ms' },
  { value: 500, title: '500 ms' },
  { value: 1000, title: '1 s' },
  { value: 2000, title: '2 s' },
  { value: 5000, title: '5 s' },
  { value: null, title: 'Off' },
];

export function App({ theme }: { theme: Theme }) {
  const connection = useConnection();
  const store = useConnectionStore();

  const [tab, setTab] = usePersistentState<Tab>('tab', 'systems');
  const [refreshMs, setRefreshMs] = usePersistentState<number | null>('refresh-ms', 1000);

  // Views point at each other: a component in the graph can be looked at in components, and the other way round
  const [graphSearch, setGraphSearch] = useState('');
  const [componentSearch, setComponentSearch] = useState('');

  const showInSystems = useCallback(
    (name: string) => {
      setGraphSearch(name);
      setTab('systems');
    },
    [setTab],
  );
  const showInComponents = useCallback(
    (name: string) => {
      setComponentSearch(name);
      setTab('components');
    },
    [setTab],
  );

  return (
    <div className="app">
      <header className="app-header">
        <strong className="brand">BIM ECS</strong>

        {connection.status === 'ready' && (
          <>
            {connection.worlds.length > 1 ? (
              <select
                className="select"
                value={connection.worldId}
                onChange={(event) => store.selectWorld(event.target.value)}
                aria-label="World"
              >
                {connection.worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="world-name">{connection.world.name}</span>
            )}
            <span className={`pill ${connection.world.running ? 'pill-ok' : ''}`}>
              {connection.world.running ? 'running' : 'stopped'}
            </span>
            <span className="muted">
              {connection.world.systems} systems · {connection.world.entities} entities
            </span>
          </>
        )}

        <nav className="tabs" role="tablist">
          {TABS.map(({ id, title }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'on' : ''}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </nav>

        <div className="spacer" />

        <label className="refresh" title="How often components, entities and resources are refreshed">
          Refresh
          <select
            className="select"
            value={String(refreshMs)}
            onChange={(event) => setRefreshMs(event.target.value === 'null' ? null : Number(event.target.value))}
          >
            {REFRESH_OPTIONS.map((option) => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="app-main">
        {connection.status === 'ready' ? (
          <>
            {tab === 'systems' && (
              <SystemsView
                theme={theme}
                search={graphSearch}
                onSearchChange={setGraphSearch}
                onShowComponent={showInComponents}
              />
            )}
            {tab === 'components' && (
              <ComponentsView
                key={componentSearch}
                refreshMs={refreshMs}
                initialSearch={componentSearch}
                onFindInSystems={showInSystems}
              />
            )}
            {tab === 'resources' && <ResourcesView refreshMs={refreshMs} />}
          </>
        ) : (
          <ConnectionNotice connection={connection} onRetry={() => store.reconnect()} />
        )}
      </main>
    </div>
  );
}

function ConnectionNotice({
  connection,
  onRetry,
}: {
  connection: Exclude<ReturnType<typeof useConnection>, { status: 'ready' }>;
  onRetry: () => void;
}) {
  switch (connection.status) {
    case 'connecting':
      return <div className="empty">Looking for a BIM ECS world in the inspected page…</div>;

    case 'no-hook':
      return (
        <div className="empty notice">
          <h2>No BIM ECS world found</h2>
          <p>Install the devtools plugin on your world, then reload the page:</p>
          <pre>
            {`import { devtoolsPlugin } from '@state-of-geneva/bim-ecs-devtools-plugin';

world.use(devtoolsPlugin({ name: 'My world' }));`}
          </pre>
          <p className="muted">
            The plugin registers the world on <code>{DEVTOOLS_HOOK_KEY}</code>. This panel keeps looking for it.
          </p>
        </div>
      );

    case 'incompatible':
      return (
        <div className="empty notice">
          <h2>Incompatible versions</h2>
          <p>
            The page speaks protocol <strong>{connection.pageProtocol}</strong>, this extension speaks protocol{' '}
            <strong>{connection.expectedProtocol}</strong>. Update the devtools plugin or the extension so both match.
          </p>
        </div>
      );

    case 'error':
      return (
        <div className="empty notice">
          <h2>Connection error</h2>
          <p>{connection.message}</p>
          <button type="button" className="btn" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
  }
}
