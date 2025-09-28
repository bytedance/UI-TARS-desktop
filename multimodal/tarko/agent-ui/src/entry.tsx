import './entry.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgentWebUI } from './standalone/app';
import { WebUIConfigProvider } from './config/webui-config-provider';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WebUIConfigProvider>
      <AgentWebUI />
    </WebUIConfigProvider>
  </React.StrictMode>,
);
