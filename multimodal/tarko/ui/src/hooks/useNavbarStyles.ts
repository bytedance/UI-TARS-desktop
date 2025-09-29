import { useDarkMode } from './useDarkMode';

export const useNavbarStyles = () => {
  const isDarkMode = useDarkMode();

  const colors = {
    agentBg: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
    agentBorder: isDarkMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
    agentText: isDarkMode ? '#e0e7ff' : '#4338ca',
    modelBg: isDarkMode ? 'rgba(55, 65, 81, 0.3)' : 'rgba(248, 250, 252, 0.8)',
    modelBorder: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(203, 213, 225, 0.6)',
    modelText: isDarkMode ? '#f3f4f6' : '#374151',
    providerText: isDarkMode ? '#d1d5db' : '#6b7280',
  };

  const getAgentBadgeStyles = () => ({
    base: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      height: '28px',
      background: colors.agentBg,
      border: `1px solid ${colors.agentBorder}`,
      borderRadius: '8px',
      cursor: 'default',
    },
    hover: { background: isDarkMode ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)' },
    reset: { background: colors.agentBg },
  });

  const getModelSelectorStyles = (isDisabled = false) => ({
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      height: '28px',
      background: colors.modelBg,
      border: `1px solid ${colors.modelBorder}`,
      borderRadius: '8px',
      opacity: isDisabled ? 0.6 : 1,
      cursor: isDisabled ? 'not-allowed' : 'default',
    },
    hover: isDisabled
      ? {}
      : {
          background: isDarkMode ? 'rgba(55, 65, 81, 0.8)' : 'rgba(241, 245, 249, 0.9)',
        },
  });

  const getTextStyles = () => ({
    agentName: {
      fontWeight: 500,
      fontSize: '12px',
      color: colors.agentText,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    modelName: {
      fontWeight: 500,
      fontSize: '12px',
      color: colors.modelText,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    provider: {
      fontWeight: 500,
      fontSize: '12px',
      color: colors.providerText,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  });

  return { isDarkMode, getAgentBadgeStyles, getModelSelectorStyles, getTextStyles };
};

export const useHoverHandlers = () => ({
  applyHoverStyles: (element: HTMLElement, styles: Record<string, any>) =>
    Object.assign(element.style, styles),
  resetStyles: (element: HTMLElement, styles: Record<string, any>) =>
    Object.assign(element.style, styles),
});
