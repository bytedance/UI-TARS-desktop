/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
