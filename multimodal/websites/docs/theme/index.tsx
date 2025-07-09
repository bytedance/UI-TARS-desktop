import { CursorProvider } from '@components/CursorContext';
import { Layout as BasicLayout } from 'rspress/theme';
import { NotFoundLayout } from '../src/components';
import { Showcase } from '../src/components/Showcase';
import { useLocation } from 'rspress/runtime';
import { Nav } from '@rspress/theme-default';

const Layout = () => {
  const location = useLocation();

  if (location.pathname.startsWith('/showcase')) {
    return (
      <CursorProvider>
        <Nav />
        <Showcase />
      </CursorProvider>
    );
  }

  return (
    <CursorProvider>
      <BasicLayout NotFoundLayout={NotFoundLayout} />
    </CursorProvider>
  );
};

export { Layout };

export * from 'rspress/theme';
