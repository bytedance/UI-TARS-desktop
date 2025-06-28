import { Layout as BasicLayout } from 'rspress/theme';
import { NotFoundLayout, StatusBar } from '../src/components';

const Layout = () => {
  return <BasicLayout beforeNav={<StatusBar />} NotFoundLayout={NotFoundLayout} />;
};

export { Layout };

export * from 'rspress/theme';
