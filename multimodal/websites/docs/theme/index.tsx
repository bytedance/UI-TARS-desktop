import { Layout as BasicLayout } from '@rspress/core/theme';
import { NotFoundLayout } from '../src/components';
import { Showcase } from '../src/components/Showcase';
import { Replay } from '../src/components/Replay';
import { useLocation } from '@rspress/core/runtime';
import { Nav } from '@rspress/core/theme';
import { DYNAMIC_ROUTE } from '../src/shared/types';

const Layout = () => {
  const location = useLocation();

  // Debug logging
  console.log('🔍 Layout Debug:', {
    pathname: location.pathname,
    showcaseRoute: DYNAMIC_ROUTE.Showcase,
    replayRoute: DYNAMIC_ROUTE.Replay,
    startsWithShowcase: location.pathname.startsWith(DYNAMIC_ROUTE.Showcase),
    startsWithReplay: location.pathname.startsWith(DYNAMIC_ROUTE.Replay),
  });

  // Handle showcase routes - both /showcase and /showcase/*
  // This needs to be checked BEFORE BasicLayout to override rspress routing
  if (location.pathname.startsWith(DYNAMIC_ROUTE.Showcase)) {
    console.log('✅ Rendering Showcase component for path:', location.pathname);
    return (
      <>
        <Nav />
        <Showcase />
      </>
    );
  }

  // Handle replay routes - both /replay and /replay/*
  if (location.pathname.startsWith(DYNAMIC_ROUTE.Replay)) {
    console.log('✅ Rendering Replay component for path:', location.pathname);
    return (
      <>
        <Nav />
        <Replay />
      </>
    );
  }

  console.log('⚠️ Falling back to BasicLayout with NotFoundLayout for path:', location.pathname);
  return <BasicLayout NotFoundLayout={NotFoundLayout} />;
};

export { Layout };

export * from '@rspress/core/theme';
