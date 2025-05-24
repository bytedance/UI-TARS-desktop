import './entry.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './v2/App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
