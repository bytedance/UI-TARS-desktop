/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Route, HashRouter, Routes } from 'react-router';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';

import { MainLayout } from './layouts/MainLayout';

import './styles/globals.css';

const Home = lazy(() => import('./pages/home'));
const LocalOperator = lazy(() => import('./pages/local'));
const RemoteOperator = lazy(() => import('./pages/remote'));

const Settings = lazy(() => import('./pages/settings/Settings'));
const Widget = lazy(() => import('./pages/widget'));

export default function App() {
  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        }
      >
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/local" element={<LocalOperator />} />
            <Route path="/remote" element={<RemoteOperator />} />
          </Route>

          <Route path="/settings" element={<Settings />} />
          <Route path="/widget" element={<Widget />} />
        </Routes>
        <Toaster
          position="top-right"
          offset={{ top: '48px' }}
          mobileOffset={{ top: '48px' }}
        />
      </Suspense>
    </HashRouter>
  );
}
