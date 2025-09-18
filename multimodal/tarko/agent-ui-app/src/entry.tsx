import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgentWebUI } from '../../agent-ui/src/standalone/app';
import { WebUIConfigProvider } from '../../agent-ui/src/config/webui-config-provider';

// Import CSS
import '../../agent-ui/src/entry.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WebUIConfigProvider>
      <AgentWebUI />
    </WebUIConfigProvider>
  </React.StrictMode>,
);
