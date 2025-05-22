import './entry.css';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'jotai';
import { Layout } from './components/Layout';
import { useSessionStore } from './store';

const AppContent = () => {
  const { loadSessions } = useSessionStore();

  // 首次渲染时加载会话
  useEffect(() => {
    const initializeApp = async () => {
      await loadSessions();
    };

    initializeApp().catch(console.error);
  }, [loadSessions]);

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
