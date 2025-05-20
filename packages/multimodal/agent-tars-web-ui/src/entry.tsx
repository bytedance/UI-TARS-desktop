import './entry.css';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Layout } from './components/Layout';
import { SessionProvider, useSession } from './contexts/SessionContext';

const AppContent = () => {
  const { createNewSession } = useSession();

  // Create initial session on load - only once when component mounts
  useEffect(() => {
    createNewSession().catch(console.error);
  }, []); // 空依赖数组，确保只执行一次

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
