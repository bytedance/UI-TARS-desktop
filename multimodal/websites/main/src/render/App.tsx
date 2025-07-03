import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { StatusBar } from './components/StatusBar';
import Home from './pages/Home';
import Blog from './pages/Blog';
import Showcase from './pages/Showcase';
import ShowcaseDetail from './pages/ShowcaseDetail';
import Docs from './pages/Docs';
import { TwitterCardMeta } from './components/TwitterCardMeta';
import { HelmetProvider } from 'react-helmet-async';
import { ETopRoute } from '../constants/routes';

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <TwitterCardMeta />
        <StatusBar />
        <Navbar />
        <Routes>
          <Route path={ETopRoute.HOME} element={<Home />} />
          <Route path={ETopRoute.BLOG} element={<Blog />} />
          <Route path="/:year/:month/:day/:slug" element={<Blog />} />
          <Route path={ETopRoute.SHOWCASE} element={<Showcase />} />
          <Route path={`${ETopRoute.SHOWCASE}/:id`} element={<ShowcaseDetail />} />
          <Route path={ETopRoute.DOC} element={<Docs />} />
          <Route path={`${ETopRoute.DOC}/:docId`} element={<Docs />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
