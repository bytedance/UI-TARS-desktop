import React, { ReactNode, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider as JotaiProvider } from 'jotai';
import { WebUIConfigProvider } from '../config/webui-config-provider';
import { useThemeInitialization } from '../common/hooks/useThemeInitialization';
import { useReplayMode } from '../common/hooks/useReplayMode';

export interface ComposableAppProps {
  // Hooks
  onBeforeInit?: () => void;
  onAfterInit?: () => void;
  
  // Slots
  navbar?: ReactNode;
  sidebar?: ReactNode;
  main?: ReactNode;
  
  // Layout options
  layout?: 'default' | 'minimal' | 'custom';
  theme?: 'light' | 'dark' | 'auto';
  
  // Children for custom layouts
  children?: ReactNode;
}

export const ComposableApp: React.FC<ComposableAppProps> = ({
  onBeforeInit,
  onAfterInit,
  navbar,
  sidebar,
  main,
  layout = 'default',
  theme = 'auto',
  children
}) => {
  const { initializeTheme } = useThemeInitialization();
  const { isReplayMode } = useReplayMode();

  useEffect(() => {
    onBeforeInit?.();
    initializeTheme();
    onAfterInit?.();
  }, [onBeforeInit, onAfterInit, initializeTheme]);

  const renderLayout = () => {
    if (layout === 'custom') {
      return children;
    }

    if (layout === 'minimal') {
      return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
          {main}
        </div>
      );
    }

    // Default layout
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {sidebar && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-700">
            {sidebar}
          </div>
        )}
        <div className="flex-1 flex flex-col">
          {navbar && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              {navbar}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            {main}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BrowserRouter>
      <JotaiProvider>
        <WebUIConfigProvider>
          <div className={`app-container ${theme === 'dark' ? 'dark' : ''}`}>
            {renderLayout()}
          </div>
        </WebUIConfigProvider>
      </JotaiProvider>
    </BrowserRouter>
  );
};

export default ComposableApp;
