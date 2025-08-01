import './entry.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgentTARSWebUI } from './standalone/app';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AgentTARSWebUI />
  </React.StrictMode>,
);
