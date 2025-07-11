import { CursorProvider } from '@components/CursorContext';
import { Layout as BasicLayout } from 'rspress/theme';
import { NotFoundLayout } from '../src/components';
import { Showcase } from '../src/components/Showcase';
import { Replay } from '../src/components/Replay';
import { useLocation } from 'rspress/runtime';
import { Nav } from '@rspress/theme-default';
import { DYNAMIC_ROUTE } from '../src/shared/types';

const Layout = () => {
  const location = useLocation();

  if (location.pathname.startsWith(DYNAMIC_ROUTE.Showcase)) {
    return (
      <>
        <Nav />
        <Showcase />
      </>
    );
  }

  if (location.pathname.startsWith(DYNAMIC_ROUTE.Replay)) {
    return (
      <>
        <Nav />
        <Replay />
      </>
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
