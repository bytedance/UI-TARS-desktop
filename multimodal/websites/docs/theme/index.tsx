import { Layout as BasicLayout } from 'rspress/theme';
import { NotFoundLayout } from '../src/components';

const Layout = () => <BasicLayout NotFoundLayout={NotFoundLayout} />;

export { Layout };

export * from 'rspress/theme';
