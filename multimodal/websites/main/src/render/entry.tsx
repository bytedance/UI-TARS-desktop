import ReactDOM from 'react-dom/client';
import App from './App';
import { NextUIProvider } from '@nextui-org/react';

import './entry.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <NextUIProvider>
    <App />
  </NextUIProvider>,
);
