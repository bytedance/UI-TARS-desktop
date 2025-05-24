import './entry.css';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'jotai';
import { Layout } from './components/Layout';
import { useSessionStore } from './store';

const AppContent = () => {
  const { loadSessions, initConnectionMonitoring, serverConnectionStatus } = useSessionStore();

  // 首次渲染时初始化连接监控和加载会话
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize connection monitoring
      const cleanup = initConnectionMonitoring();

      // Load sessions if connected
      if (serverConnectionStatus.connected) {
        await loadSessions();
      }

      return cleanup;
    };

    const cleanupFn = initializeApp();

    // Cleanup on unmount
    return () => {
      cleanupFn.then((cleanup) => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
    };
  }, [initConnectionMonitoring, loadSessions, serverConnectionStatus.connected]);

  return <Layout />;
};

const App = () => {
  return (
    <Provider>
      <AppContent />
    </Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
