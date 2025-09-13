import React from 'react';

export const Home = () => <div>Home Component</div>;
export const App = (props: { navbar?: React.ReactNode; sidebar?: React.ReactNode; onBeforeInit?: () => void }) => (
  <div>
    {props.navbar}
    {props.sidebar}
    <div>App Content</div>
  </div>
);
export const Navbar = (props: { items?: React.ReactNode }) => <div>Navbar {props.items}</div>;
export const Sidebar = (props: { items?: React.ReactNode }) => <div>Sidebar {props.items}</div>;