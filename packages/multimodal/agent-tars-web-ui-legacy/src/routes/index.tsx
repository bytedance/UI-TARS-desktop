import { createHashRouter, RouterProvider } from 'react-router-dom';
import { ChatProvider, LocalChatStorage, ChatStorageProvider } from '../components/Chat';
import { HomePage } from '../pages/Home';
import { ChatPage } from '../pages/Chat';
import { SettingsPage } from '../pages/Settings';
import { ErrorBoundary } from '../components/ErrorBoundary';

const router = createHashRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/chat',
    element: <ChatPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
]);

// 使用 LocalStorage 存储聊天记录
const storage = new LocalChatStorage();

export function AppRouter(): JSX.Element {
  return (
    <ErrorBoundary>
      <ChatStorageProvider storage={storage}>
        <ChatProvider>
          <RouterProvider router={router} />
        </ChatProvider>
      </ChatStorageProvider>
    </ErrorBoundary>
  );
}
