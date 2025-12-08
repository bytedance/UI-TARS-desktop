/* eslint-disable no-debugger */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDarkMode } from '@tarko/ui';
import { ShareButton } from '@/standalone/share';
import { ShareModal } from '@/standalone/share/ShareModal';
import { AboutModal } from './AboutModal';
import { ThemeToggle } from '@/standalone/components';

import {
  FiMoon,
  FiSun,
  FiInfo,
  FiCpu,
  FiFolder,
  FiZap,
  FiSettings,
  FiMonitor,
  FiCode,
  FiMoreHorizontal,
  FiShare,
  FiTerminal,
  FiGlobe,
  FiHome,
} from 'react-icons/fi';
import { MdDesktopWindows } from 'react-icons/md';

import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useLogoType } from '@/common/hooks/useLogoType';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/common/services/apiService';
import { NavbarModelSelector } from './ModelSelector';
import { getLogoUrl, getAgentTitle, getWorkspaceNavItems } from '@/config/web-ui-config';
import type { WorkspaceNavItemIcon, WorkspaceNavItem } from '@tarko/interface';
import { getModelDisplayName } from '@/common/utils/modelUtils';
import { showEmbedFrameAtom, hideEmbedFrameAtom } from '@/common/state/atoms/ui';
import { useSetAtom } from 'jotai';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  MenuDivider,
  useNavbarStyles,
  useHoverHandlers,
} from '@tarko/ui';

import './Navbar.css';

export const Navbar: React.FC = () => {
  const { activeSessionId, isProcessing, sessionMetadata, workspaceDisplayState } = useSession();
  const { isReplayMode } = useReplayMode();
  const { isDarkMode } = useNavbarStyles();
  const [showAboutModal, setShowAboutModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [hasAutoActivated, setHasAutoActivated] = React.useState(false);
  const [runtimeSettings, setRuntimeSettings] = React.useState<Record<string, any>>({});
  const workspaceNavItems = getWorkspaceNavItems(sessionMetadata?.sandboxUrl);
  const showEmbedFrame = useSetAtom(showEmbedFrameAtom);
  const hideEmbedFrame = useSetAtom(hideEmbedFrameAtom);

  const navigate = useNavigate();

  // Auto-activate embed frames with autoActive: true or function returning true
  // Only activate once when nav items are loaded and no active frame exists
  useEffect(() => {
    if (
      !hasAutoActivated &&
      workspaceDisplayState.mode !== 'embed-frame' &&
      workspaceNavItems.length > 0 &&
      activeSessionId
    ) {
      const autoActiveItem = workspaceNavItems.find((item) => {
        if (item.behavior !== 'embed-frame' || !item.autoActive) {
          return false;
        }

        // Handle both boolean and string expression forms of autoActive
        if (typeof item.autoActive === 'boolean') {
          return item.autoActive;
        } else if (typeof item.autoActive === 'string') {
          try {
            // Create a function from the string expression
            // const evaluateExpression = new Function('runtimeSettings', `return ${item.autoActive}`);
            const evaluateExpression = new Function(
              'runtimeSettings',
              'debug',
              `"use strict"; 
              console.log('[Runtime Settings]', runtimeSettings);
              return (${item.autoActive});
              `,
            );
            return evaluateExpression(runtimeSettings, (runtimeSettings: Record<string, any>) => {
              debugger;
              return true;
            });
          } catch (error) {
            console.error(`Failed to evaluate autoActive expression "${item.autoActive}":`, error);
            return false;
          }
        }

        return false;
      });

      if (autoActiveItem) {
        showEmbedFrame(autoActiveItem);
        setHasAutoActivated(true);
      }
    }
  }, [
    workspaceNavItems,
    workspaceDisplayState.mode,
    showEmbedFrame,
    activeSessionId,
    hasAutoActivated,
    runtimeSettings, // Add runtimeSettings to dependency array
  ]);

  // Fetch runtime settings when session changes
  useEffect(() => {
    const fetchRuntimeSettings = async () => {
      if (activeSessionId && !isReplayMode) {
        try {
          const response = await apiService.getSessionRuntimeSettings(activeSessionId);
          if (response.currentValues) {
            setRuntimeSettings(response.currentValues);
          }
        } catch (error) {
          console.error('Failed to fetch runtime settings:', error);
        }
      } else {
        setRuntimeSettings({});
      }
    };

    fetchRuntimeSettings();
    setHasAutoActivated(false); // Reset auto-activation flag when session changes
  }, [activeSessionId, isReplayMode]);

  const handleNavigateHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  useEffect(() => {
    const updateTitle = () => {
      const parts = [];

      if (sessionMetadata?.agentInfo?.name) {
        parts.push(sessionMetadata.agentInfo.name);
      }

      const title = parts.length > 0 ? parts.join(' | ') : getAgentTitle();
      document.title = title;
    };

    updateTitle();
  }, [sessionMetadata?.agentInfo?.name]);

  const logoUrl = getLogoUrl();

  const logoType = useLogoType();

  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('agent-tars-theme', newMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleNavItemClick = (navItem: WorkspaceNavItem) => {
    if (navItem.behavior === 'embed-frame') {
      // Toggle embed frame state
      if (
        workspaceDisplayState.mode === 'embed-frame' &&
        workspaceDisplayState.embedFrame?.title === navItem.title
      ) {
        hideEmbedFrame();
        // Reset auto-activation flag when user manually hides
        setHasAutoActivated(true); // Prevent re-activation
      } else {
        showEmbedFrame(navItem);
      }
    } else {
      // Default behavior: open in new tab
      window.open(navItem.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMobileMenuOpen = () => {
    setMobileMenuOpen(true);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuOpen(false);
  };

  const handleShareOpen = () => {
    setShowShareModal(true);
    setMobileMenuOpen(false); // Close mobile menu if open
  };

  const handleShareClose = () => {
    setShowShareModal(false);
  };

  const getNavItemIcon = (iconType: WorkspaceNavItemIcon = 'default') => {
    const iconMap = {
      code: FiCode,
      monitor: FiMonitor,
      terminal: FiTerminal,
      browser: FiGlobe,
      desktop: MdDesktopWindows,
      default: FiSettings,
    };
    return iconMap[iconType];
  };

  const getNavItemStyle = (iconType: WorkspaceNavItemIcon = 'default') => {
    const styleMap = {
      code: {
        className:
          'flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200/60 dark:border-emerald-700/50 hover:bg-emerald-100/90 dark:hover:bg-emerald-800/40 hover:text-emerald-800 dark:hover:text-emerald-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
      monitor: {
        className:
          'flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200/60 dark:border-blue-700/50 hover:bg-blue-100/90 dark:hover:bg-blue-800/40 hover:text-blue-800 dark:hover:text-blue-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
      terminal: {
        className:
          'flex items-center gap-1.5 px-3 py-1.5 bg-purple-50/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg border border-purple-200/60 dark:border-purple-700/50 hover:bg-purple-100/90 dark:hover:bg-purple-800/40 hover:text-purple-800 dark:hover:text-purple-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
      browser: {
        className:
          'flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50/80 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-lg border border-cyan-200/60 dark:border-cyan-700/50 hover:bg-cyan-100/90 dark:hover:bg-cyan-800/40 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
      desktop: {
        className:
          'flex items-center gap-1.5 px-3 py-1.5 bg-orange-50/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg border border-orange-200/60 dark:border-orange-700/50 hover:bg-orange-100/90 dark:hover:bg-orange-800/40 hover:text-orange-800 dark:hover:text-orange-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
      default: {
        className:
          'flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100/90 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
    };
    return styleMap[iconType] || styleMap.default;
  };

  return (
    <div>
      <div className="h-12 backdrop-blur-sm flex items-center px-3 flex-shrink-0 relative">
        <div className="flex items-center">
          {logoType === 'traffic-lights' ? (
            <div className="flex space-x-1.5 mr-3">
              <div className="traffic-light traffic-light-red" />
              <div className="traffic-light traffic-light-yellow" />
              <div className="traffic-light traffic-light-green" />
            </div>
          ) : logoType === 'space' ? (
            <div className="mr-3" style={{ width: '54px' }} />
          ) : null}
        </div>

        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 max-[968px]:absolute max-[968px]:left-1/2 max-[968px]:top-1/2 max-[968px]:transform max-[968px]:-translate-x-1/2 max-[968px]:-translate-y-1/2">
          <DynamicNavbarCenter
            sessionMetadata={sessionMetadata}
            activeSessionId={activeSessionId}
          />
        </div>

        <div className="flex items-center ml-auto relative">
          <div className="hidden md:flex items-center space-x-2">
            {!isReplayMode && workspaceNavItems.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                {workspaceNavItems.map((navItem) => {
                  const IconComponent = getNavItemIcon(navItem.icon);
                  const { className } = getNavItemStyle(navItem.icon);
                  const isActive =
                    workspaceDisplayState.mode === 'embed-frame' &&
                    workspaceDisplayState.embedFrame?.title === navItem.title;
                  const title =
                    navItem.behavior === 'embed-frame'
                      ? isActive
                        ? `Hide ${navItem.title}`
                        : `Show ${navItem.title} in workspace`
                      : `Open ${navItem.title} in new tab`;

                  return (
                    <button
                      key={navItem.title}
                      onClick={() => handleNavItemClick(navItem)}
                      className={`
                        ${className} 
                        ${
                          isActive
                            ? `
                          relative overflow-hidden
                          before:absolute before:inset-0 before:rounded-lg
                          before:bg-gradient-to-r before:from-blue-500/20 before:via-purple-500/20 before:to-pink-500/20
                          before:animate-pulse before:opacity-75
                          shadow-lg shadow-blue-500/25 dark:shadow-blue-500/40
                          ring-2 ring-blue-500/50 ring-offset-2 ring-offset-white dark:ring-offset-gray-900
                          scale-[1.05] hover:scale-[1.08] active:scale-[1.02]
                          border-blue-400/60 dark:border-blue-500/60
                          bg-gradient-to-r from-blue-50/90 via-white/90 to-purple-50/90
                          dark:from-blue-900/40 dark:via-gray-800/40 dark:to-purple-900/40
                          text-blue-800 dark:text-blue-200
                          font-semibold
                          backdrop-blur-md
                        `
                            : 'hover:scale-[1.02] active:scale-[0.98]'
                        }
                        transition-all duration-300 ease-out
                        relative
                      `}
                      title={title}
                    >
                      <IconComponent
                        size={12}
                        className={`${
                          isActive
                            ? 'text-blue-600 dark:text-blue-300 drop-shadow-sm animate-pulse'
                            : 'opacity-70'
                        } 
                          transition-all duration-300
                        `}
                      />
                      {navItem.title}
                      {isActive && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {/* About button */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-all hover:scale-110 active:scale-95"
              title={`About ${getAgentTitle()}`}
            >
              <FiInfo size={16} />
            </button>

            {/* Dark mode toggle */}
            <ThemeToggle variant="navbar" size="medium" />

            {activeSessionId && !isReplayMode && (
              <ShareButton variant="navbar" disabled={isProcessing} onShare={handleShareOpen} />
            )}
          </div>

          <div className="md:hidden">
            <IconButton
              onClick={handleMobileMenuOpen}
              size="small"
              sx={{ color: 'text.secondary' }}
              title="More options"
            >
              <FiMoreHorizontal size={16} />
            </IconButton>

            <Menu open={mobileMenuOpen} onClose={handleMobileMenuClose}>
              {!isReplayMode && workspaceNavItems.length > 0 && (
                <>
                  {workspaceNavItems.map((navItem) => {
                    const IconComponent = getNavItemIcon(navItem.icon);
                    const isActive =
                      workspaceDisplayState.mode === 'embed-frame' &&
                      workspaceDisplayState.embedFrame?.title === navItem.title;
                    const title =
                      navItem.behavior === 'embed-frame'
                        ? isActive
                          ? `Hide ${navItem.title}`
                          : `Show ${navItem.title} in workspace`
                        : `Open ${navItem.title} in new tab`;

                    return (
                      <MenuItem
                        key={navItem.title}
                        onClick={() => {
                          handleNavItemClick(navItem);
                          handleMobileMenuClose();
                        }}
                        icon={
                          <div className="relative">
                            <IconComponent
                              size={16}
                              className={
                                isActive ? 'text-blue-500 dark:text-blue-400 animate-pulse' : ''
                              }
                            />
                            {isActive && (
                              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping" />
                            )}
                          </div>
                        }
                        className={
                          isActive
                            ? `
                          bg-gradient-to-r from-blue-50/80 via-white/80 to-purple-50/80 
                          dark:from-blue-900/30 dark:via-gray-800/30 dark:to-purple-900/30
                          border-l-2 border-l-blue-500 dark:border-l-blue-400
                          text-blue-700 dark:text-blue-300 font-medium
                        `
                            : ''
                        }
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={isActive ? 'font-semibold' : ''}>{navItem.title}</span>
                          {isActive && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-100/60 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                      </MenuItem>
                    );
                  })}
                  <MenuDivider />
                </>
              )}

              <MenuItem
                onClick={() => {
                  setShowAboutModal(true);
                  handleMobileMenuClose();
                }}
                icon={<FiInfo size={16} />}
              >
                About {getAgentTitle()}
              </MenuItem>

              <MenuItem
                onClick={() => {
                  toggleDarkMode();
                  handleMobileMenuClose();
                }}
                icon={isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
              >
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </MenuItem>

              {/* Model Selector for Mobile */}
              {sessionMetadata?.modelConfig && (
                <>
                  <MenuDivider />
                  <MenuItem
                    onClick={() => handleMobileMenuClose()}
                    icon={<FiCpu size={16} />}
                    disabled
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Model</span>
                      <span className="text-sm font-medium">
                        {getModelDisplayName(sessionMetadata.modelConfig)} •{' '}
                        {sessionMetadata.modelConfig.provider}
                      </span>
                    </div>
                  </MenuItem>
                </>
              )}

              {activeSessionId && !isReplayMode && (
                <MenuItem
                  onClick={handleShareOpen}
                  icon={<FiShare size={16} />}
                  disabled={isProcessing}
                >
                  Share
                </MenuItem>
              )}
            </Menu>
          </div>
        </div>
      </div>

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        sessionMetadata={sessionMetadata}
      />

      {activeSessionId && (
        <ShareModal
          isOpen={showShareModal}
          onClose={handleShareClose}
          sessionId={activeSessionId}
        />
      )}
    </div>
  );
};

interface DynamicNavbarCenterProps {
  sessionMetadata?: {
    agentInfo?: { name: string; [key: string]: any };
    modelConfig?: { provider: string; id: string; [key: string]: any };
    [key: string]: any;
  };
  activeSessionId?: string;
}

const DynamicNavbarCenter: React.FC<DynamicNavbarCenterProps> = ({
  sessionMetadata,
  activeSessionId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  const [agentTextWidth, setAgentTextWidth] = useState(0);
  const [modelTextWidth, setModelTextWidth] = useState(0);
  const { isDarkMode, getAgentBadgeStyles, getTextStyles } = useNavbarStyles();
  const { applyHoverStyles, resetStyles } = useHoverHandlers();

  useEffect(() => {
    const calculateWidths = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.offsetWidth;

      const reservedSpace = 120;
      const available = Math.max(containerWidth - reservedSpace, 200);

      setAvailableWidth(available);

      const measureText = (text: string, className: string) => {
        const temp = document.createElement('span');
        temp.style.visibility = 'hidden';
        temp.style.position = 'absolute';
        temp.style.fontSize = '12px';
        temp.style.fontWeight = className.includes('font-medium') ? '500' : '400';
        temp.textContent = text;
        document.body.appendChild(temp);
        const width = temp.offsetWidth;
        document.body.removeChild(temp);
        return width;
      };

      if (sessionMetadata?.agentInfo?.name) {
        setAgentTextWidth(measureText(sessionMetadata.agentInfo.name, 'font-medium'));
      }

      if (sessionMetadata?.modelConfig) {
        const modelText = [
          getModelDisplayName(sessionMetadata.modelConfig),
          sessionMetadata.modelConfig.provider,
        ]
          .filter(Boolean)
          .join(' • ');
        setModelTextWidth(measureText(modelText, 'font-medium'));
      }
    };

    calculateWidths();

    const handleResize = () => {
      setTimeout(calculateWidths, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [
    sessionMetadata?.agentInfo?.name,
    sessionMetadata?.modelConfig?.id,
    sessionMetadata?.modelConfig?.displayName,
    sessionMetadata?.modelConfig?.provider,
  ]);

  const totalTextWidth = agentTextWidth + modelTextWidth;
  const hasSpace = totalTextWidth <= availableWidth;

  // Agent name should never be truncated
  const agentMaxWidth = 'none';

  const modelMaxWidth = hasSpace
    ? 'none'
    : `${Math.max(availableWidth - (agentTextWidth + 80), 150)}px`; // Model can be truncated if needed

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 min-w-0"
      style={{ maxWidth: '100%' }}
    >
      {sessionMetadata?.agentInfo?.name && (
        <div
          style={{
            ...getAgentBadgeStyles().base,
            maxWidth: agentMaxWidth,
          }}
          onMouseEnter={(e) => {
            applyHoverStyles(e.currentTarget, getAgentBadgeStyles().hover);
          }}
          onMouseLeave={(e) => {
            resetStyles(e.currentTarget, getAgentBadgeStyles().reset);
          }}
        >
          <FiZap size={12} color={isDarkMode ? '#a5b4fc' : '#6366f1'} style={{ flexShrink: 0 }} />
          <span
            style={{
              ...getTextStyles().agentName,
            }}
            title={sessionMetadata.agentInfo.name}
          >
            {sessionMetadata.agentInfo.name}
          </span>
        </div>
      )}

      <NavbarModelSelector
        className="min-w-0"
        activeSessionId={activeSessionId}
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
