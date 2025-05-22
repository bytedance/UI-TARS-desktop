import './entry.css';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Layout } from './components/Layout';
import { SessionProvider, useSession } from './contexts/SessionContext';

const AppContent = () => {
  const { loadSessions } = useSession();

  // Load sessions on first render
  useEffect(() => {
    const initializeApp = async () => {
      await loadSessions();
    };

    initializeApp().catch(console.error);
  }, []);

  return <Layout />;
};

const App = () => {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
