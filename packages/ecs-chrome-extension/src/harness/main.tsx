import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BridgeClient } from '../bridge/bridge-client';
import { ConnectionProvider } from '../bridge/connection-context';
import { ConnectionStore } from '../bridge/connection-store';
import { PageTransport } from '../bridge/page-transport';
import { App } from '../panel/App';
import { detectTheme } from '../ui/theme';
import '../ui/theme.css';
import { createDemoWorld, type DemoWorld } from './demo-world';

/**
 * Development harness: the panel runs in a regular page, against a real world instrumented by the real plugin.
 * The data goes through the same JSON boundary as in the extension.
 */
const theme = detectTheme();
document.documentElement.dataset.theme = theme;

const store = new ConnectionStore(new BridgeClient(new PageTransport()), { pollIntervalMs: 400 });
store.start();

function Harness() {
  const [alive, setAlive] = useState(true);
  const [demo, setDemo] = useState<DemoWorld>();

  // The world follows the lifecycle of the effect: StrictMode runs effects twice, a world must not leak
  useEffect(() => {
    if (!alive) return;

    const created = createDemoWorld('Demo game');
    const stopAnimation = created.animate();
    setDemo(created);

    return () => {
      stopAnimation();
      created.dispose();
      setDemo(undefined);
    };
  }, [alive]);

  return (
    <div className="harness">
      <div className="harness-bar">
        <strong>Harness</strong>
        <button className="btn" disabled={!demo} onClick={() => demo?.spawnBrick()}>
          Spawn brick
        </button>
        <button className="btn" disabled={!demo} onClick={() => demo?.removeRandomBrick()}>
          Remove brick
        </button>
        <button className="btn" disabled={!demo} onClick={() => demo?.freezeRandomBrick()}>
          Freeze brick
        </button>
        <button className="btn" disabled={!demo} onClick={() => demo?.registerLateSystem()}>
          Register a system
        </button>
        <button className="btn" onClick={() => setAlive((current) => !current)}>
          {alive ? 'Dispose world' : 'Create world'}
        </button>
      </div>
      <div className="harness-app">
        <App theme={theme} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider store={store}>
      <Harness />
    </ConnectionProvider>
  </StrictMode>,
);
