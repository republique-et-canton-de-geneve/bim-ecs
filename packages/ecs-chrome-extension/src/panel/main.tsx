import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BridgeClient } from '../bridge/bridge-client';
import { ChromeTransport } from '../bridge/chrome-transport';
import { ConnectionProvider } from '../bridge/connection-context';
import { ConnectionStore } from '../bridge/connection-store';
import { detectTheme } from '../ui/theme';
import { App } from './App';
import '../ui/theme.css';

const theme = detectTheme();
document.documentElement.dataset.theme = theme;

const store = new ConnectionStore(new BridgeClient(new ChromeTransport()), {
  // A hidden panel must not cost anything to the inspected page
  isActive: () => !document.hidden,
});

// The page is another one after a navigation: its worlds are other ones too
chrome.devtools.network.onNavigated.addListener(() => store.reconnect());
store.start();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConnectionProvider store={store}>
      <App theme={theme} />
    </ConnectionProvider>
  </StrictMode>,
);
