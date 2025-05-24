import React, { useEffect } from 'react';
import { Provider } from 'jotai';
import { Layout } from './components/Layout';
import { ApiProvider } from './contexts/ApiContext';
import { useConnectionStatus } from './hooks/useConnectionStatus';

/**
 * App组件
 * 应用的入口组件，设置全局提供者并初始化核心服务
 */
export const App: React.FC = () => {
  return (
    <Provider>
      <ApiProvider>
        <AppContent />
      </ApiProvider>
    </Provider>
  );
};

/**
 * AppContent组件
 * 包含应用初始化逻辑和主布局
 */
const AppContent: React.FC = () => {
  const { initializeConnection } = useConnectionStatus();

  // 初始化连接监控
  useEffect(() => {
    const cleanup = initializeConnection();
    return cleanup;
  }, [initializeConnection]);

  return <Layout />;
};
