import React from 'react';
import { Home, App, Navbar, Sidebar } from '@tarko/agent-ui';

const Layout = () => (
  <App
    onBeforeInit={() => {}}
    navbar={<Navbar items={<><>} />}
    sidebar={<Sidebar items={<><>} />}
  />
);

export const CustomHome = () => <Home />;