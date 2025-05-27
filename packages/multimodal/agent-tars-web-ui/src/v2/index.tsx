import React from 'react';
import { Provider } from 'jotai';
import { Routes, Route } from 'react-router-dom';
import { App } from './components/App';
import { SessionRouter } from './components/Router/SessionRouter';

/**
 * Agent TARS Web UI v2 - Entry Component
 *
 * Provides the Jotai atom provider and sets up routing.
 */
export const AgentTARSWebUI: React.FC = () => {
  return (
    <Provider>
      <App />
    </Provider>
  );
};
