import { useDarkMode } from './useDarkMode';

// 共享的导航栏样式
export const useNavbarStyles = () => {
  const isDarkMode = useDarkMode();

  // Agent 标签样式
  const getAgentBadgeStyles = () => ({
    base: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      paddingLeft: '10px',
      paddingRight: '10px',
      paddingTop: '3px',
      paddingBottom: '3px',
      height: '28px',
      minHeight: '28px',
      width: 'auto',
      minWidth: 'auto',
      background: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
      backdropFilter: 'blur(8px)',
      border: isDarkMode
        ? '1px solid rgba(99, 102, 241, 0.3)'
        : '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: '8px',
      transition: 'all 150ms ease-in-out',
      cursor: 'default',
    },
    hover: {
      background: isDarkMode
        ? 'rgba(99, 102, 241, 0.25)'
        : 'rgba(99, 102, 241, 0.12)',
      border: isDarkMode
        ? '1px solid rgba(99, 102, 241, 0.4)'
        : '1px solid rgba(99, 102, 241, 0.3)',
      boxShadow: isDarkMode
        ? '0 2px 8px -1px rgba(99, 102, 241, 0.2)'
        : '0 2px 8px -1px rgba(99, 102, 241, 0.1)',
    },
    reset: {
      background: isDarkMode
        ? 'rgba(99, 102, 241, 0.15)'
        : 'rgba(99, 102, 241, 0.08)',
      border: isDarkMode
        ? '1px solid rgba(99, 102, 241, 0.3)'
        : '1px solid rgba(99, 102, 241, 0.2)',
      boxShadow: 'none',
    },
  });

  // 模型选择器样式
  const getModelSelectorStyles = (isDisabled = false) => ({
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.75,
      px: 1.25,
      py: 0.375,
      height: '28px',
      minHeight: '28px',
      width: 'auto',
      minWidth: 'auto',
      maxWidth: '300px',
      background: isDisabled
        ? isDarkMode
          ? 'rgba(55, 65, 81, 0.15)'
          : 'rgba(248, 250, 252, 0.4)'
        : isDarkMode
          ? 'rgba(55, 65, 81, 0.3)'
          : 'rgba(248, 250, 252, 0.8)',
      backdropFilter: 'blur(8px)',
      border: isDisabled
        ? isDarkMode
          ? '1px solid rgba(75, 85, 99, 0.15)'
          : '1px solid rgba(203, 213, 225, 0.3)'
        : isDarkMode
          ? '1px solid rgba(75, 85, 99, 0.3)'
          : '1px solid rgba(203, 213, 225, 0.6)',
      borderRadius: '8px',
      opacity: isDisabled ? 0.6 : 1,
      cursor: isDisabled ? 'not-allowed' : 'default',
    },
    hover: isDisabled
      ? {}
      : {
          background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
          boxShadow: isDarkMode
            ? '0 2px 4px -1px rgba(0, 0, 0, 0.2)'
            : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
        },
  });

  // 文本样式
  const getTextStyles = () => ({
    agentName: {
      fontWeight: 500,
      fontSize: '12px',
      color: isDarkMode ? '#e0e7ff' : '#4338ca',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    modelName: {
      fontWeight: 500,
      fontSize: '12px',
      color: isDarkMode ? '#f3f4f6' : '#374151',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    provider: {
      fontWeight: 500,
      fontSize: '12px',
      color: isDarkMode ? '#d1d5db' : '#6b7280',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  });

  return {
    isDarkMode,
    getAgentBadgeStyles,
    getModelSelectorStyles,
    getTextStyles,
  };
};

// Hover 事件处理器
export const useHoverHandlers = () => {
  const applyHoverStyles = (element: HTMLElement, hoverStyles: Record<string, any>) => {
    Object.assign(element.style, hoverStyles);
  };

  const resetStyles = (element: HTMLElement, resetStyles: Record<string, any>) => {
    Object.assign(element.style, resetStyles);
  };

  return { applyHoverStyles, resetStyles };
};
