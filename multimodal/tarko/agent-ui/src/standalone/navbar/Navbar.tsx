import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDarkMode } from '@tarko/ui';
import { ShareButton } from '@/standalone/share';
import { ShareModal } from '@/standalone/share/ShareModal';
import { AboutModal } from './AboutModal';

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
import type { WorkspaceNavItemIcon } from '@tarko/interface';
import { getModelDisplayName } from '@/common/utils/modelUtils';
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
  const { activeSessionId, isProcessing, sessionMetadata } = useSession();
  const { isReplayMode } = useReplayMode();
  const { isDarkMode } = useNavbarStyles();
  const [showAboutModal, setShowAboutModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const workspaceNavItems = getWorkspaceNavItems();
  const navigate = useNavigate();

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

  const handleNavItemClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
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

        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 max-[968px]:relative max-[968px]:left-auto max-[968px]:top-auto max-[968px]:transform-none max-[968px]:flex-1 max-[968px]:mx-3">
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
                  return (
                    <button
                      key={navItem.title}
                      onClick={() => handleNavItemClick(navItem.link)}
                      className={`${className} hover:scale-[1.02] active:scale-[0.98] transition-transform`}
                      title={`Open ${navItem.title} in new tab`}
                    >
                      <IconComponent size={12} className="opacity-70" />
                      {navItem.title}
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
            <button
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-all hover:scale-110 active:scale-95"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>

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
                    return (
                      <MenuItem
                        key={navItem.title}
                        onClick={() => {
                          handleNavItemClick(navItem.link);
                          handleMobileMenuClose();
                        }}
                        icon={<IconComponent size={16} />}
                      >
                        {navItem.title}
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
