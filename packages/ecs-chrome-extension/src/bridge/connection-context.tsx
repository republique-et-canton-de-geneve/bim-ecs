import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ConnectionState, ConnectionStore } from './connection-store';

const ConnectionContext = createContext<ConnectionStore | null>(null);

export function ConnectionProvider({ store, children }: { store: ConnectionStore; children: ReactNode }) {
  return <ConnectionContext.Provider value={store}>{children}</ConnectionContext.Provider>;
}

export function useConnectionStore() {
  const store = useContext(ConnectionContext);
  if (!store) throw new Error('useConnectionStore must be used within a ConnectionProvider');
  return store;
}

/** The state of the connection to the inspected page */
export function useConnection(): ConnectionState {
  const store = useConnectionStore();
  return useSyncExternalStore(store.subscribe, store.getState);
}

/** The connection, for views only rendered once a world is available */
export function useReadyConnection() {
  const connection = useConnection();
  if (connection.status !== 'ready') throw new Error('useReadyConnection requires a ready connection');
  return connection;
}
