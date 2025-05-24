import React from 'react';
import { Provider } from 'jotai';
import { App } from './components/App';

/**
 * Agent TARS Web UI v2 - Entry Component
 *
 * Provides the Jotai atom provider and renders the main App component.
 * This is the entry point for the v2 architecture.
 */
export const AgentTARSWebUI: React.FC = () => {
  return (
    <Provider>
      <App />
    </Provider>
  );
};
