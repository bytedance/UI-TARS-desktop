import { Layout as BasicLayout } from 'rspress/theme';
import { NotFoundLayout } from '../src/components';

const Layout = () => {
  return <BasicLayout NotFoundLayout={NotFoundLayout} />;
};

export { Layout };

export * from 'rspress/theme';
