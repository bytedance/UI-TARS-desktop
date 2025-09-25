
import { Layout as BasicLayout } from '@rspress/core/theme';
import { NotFoundLayout } from '../src/components';

const Layout = () => {
  return <BasicLayout NotFoundLayout={NotFoundLayout} />;
};

export { Layout };

export * from '@rspress/core/theme';
