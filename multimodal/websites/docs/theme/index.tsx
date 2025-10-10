
import { Layout as BasicLayout } from '@rspress/core/theme';
import { NotFoundLayout } from '../src/components';
import { Showcase } from '../src/components/Showcase';
import { Replay } from '../src/components/Replay';
import { useLocation } from '@rspress/core/runtime';
import { Nav } from '@rspress/theme-default';
import { DYNAMIC_ROUTE } from '../src/shared/types';

const Layout = () => {
  const location = useLocation();

  // Debug logging
  console.log('🔍 Layout Debug:', {
    pathname: location.pathname,
    showcaseRoute: DYNAMIC_ROUTE.Showcase,
    replayRoute: DYNAMIC_ROUTE.Replay,
    startsWithShowcase: location.pathname.startsWith(DYNAMIC_ROUTE.Showcase),
    startsWithReplay: location.pathname.startsWith(DYNAMIC_ROUTE.Replay)
  });

  if (location.pathname.startsWith(DYNAMIC_ROUTE.Showcase)) {
    console.log('✅ Rendering Showcase component');
    return (
      <>
        <Nav />
        <Showcase />
      </>
    );
  }

  if (location.pathname.startsWith(DYNAMIC_ROUTE.Replay)) {
    console.log('✅ Rendering Replay component');
    return (
      <>
        <Nav />
        <Replay />
      </>
    );
  }

  console.log('⚠️ Falling back to BasicLayout with NotFoundLayout');
  return <BasicLayout NotFoundLayout={NotFoundLayout} />;
};

export { Layout };

export * from '@rspress/core/theme';
