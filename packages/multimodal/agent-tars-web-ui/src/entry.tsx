import './assets/main.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './routes';

const App =
  process.env.NODE_ENV === 'production' ? (
    <AppRouter />
  ) : (
    <React.StrictMode>
      <AppRouter />
    </React.StrictMode>
  );

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(App);
