import { CursorProvider } from '@components/CursorContext';
import { Layout as BasicLayout } from 'rspress/theme';
import { NotFoundLayout } from '../src/components';

const Layout = () => {
  return (
    <CursorProvider>
      <BasicLayout NotFoundLayout={NotFoundLayout} />
    </CursorProvider>
  );
};

export { Layout };

export * from 'rspress/theme';
