/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { ChakraProvider } from '@chakra-ui/react';
import { Route, HashRouter as Router, Routes } from 'react-router';

import './App.css';
import Home from './pages/home';
import InProgressing from './pages/inProgressing';
import Launcher from './pages/launcher';
import Settings from './pages/settings';
import { chakraUItheme } from './theme';

export default function App() {
  return (
    <ChakraProvider theme={chakraUItheme}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/launcher" element={<Launcher />} />
          <Route path="/in-progressing" element={<InProgressing />} />
        </Routes>
      </Router>
    </ChakraProvider>
  );
}
