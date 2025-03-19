import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.scss';
import { initMonacoWorkers } from './utils/monacoConfig';

initMonacoWorkers();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
