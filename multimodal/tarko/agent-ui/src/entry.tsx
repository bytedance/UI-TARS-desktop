import './entry.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AgentWebUI } from './standalone/app';
import { WebUIConfigProvider } from './config/webui-config-provider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WebUIConfigProvider>
      <AgentWebUI />
    </WebUIConfigProvider>
    <ToastContainer
      position="top-right"
      autoClose={2000}
      limit={1}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
      toastClassName="rounded-xl shadow-lg border border-gray-200"
      className="text-gray-800 font-medium"
      progressClassName="bg-blue-500"
    />
  </React.StrictMode>,
);
