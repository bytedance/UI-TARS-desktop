import './entry.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgentTARSWebUI } from './v2';

// Render the new v2 architecture with router support
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AgentTARSWebUI />
  </React.StrictMode>,
);
