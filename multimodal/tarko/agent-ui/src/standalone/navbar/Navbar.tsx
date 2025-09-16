import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShareButton } from '@/standalone/share';
import { AboutModal } from './AboutModal';
import { motion } from 'framer-motion';
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
} from 'react-icons/fi';
import { MdDesktopWindows } from 'react-icons/md';
import { GoSidebarCollapse, GoSidebarExpand } from 'react-icons/go';

import { Box, Typography, ThemeProvider, Menu, MenuItem, Divider, IconButton } from '@mui/material';
import { useLayout } from '@/common/hooks/useLayout';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useDarkMode } from '@/common/hooks/useDarkMode';
import { useLogoType } from '@/common/hooks/useLogoType';
import { apiService } from '@/common/services/apiService';
import { NavbarModelSelector } from './ModelSelector';
import { getLogoUrl, getAgentTitle, getWorkspaceNavItems } from '@/config/web-ui-config';
import type { WorkspaceNavItemIcon } from '@tarko/interface';
import { getModelDisplayName } from '@/common/utils/modelUtils';
import { createBasicMuiTheme } from '@/common/utils/muiTheme';

import './Navbar.css';

export const Navbar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { activeSessionId, isProcessing, sessionMetadata } = useSession();
  const { isReplayMode } = useReplayMode();
  const isDarkMode = useDarkMode();
  const [showAboutModal, setShowAboutModal] = React.useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState<null | HTMLElement>(null);
  const workspaceNavItems = getWorkspaceNavItems();

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

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
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
    const colors = {
      code: 'emerald',
      monitor: 'blue',
      terminal: 'purple', 
      browser: 'cyan',
      desktop: 'orange',
      default: 'slate',
    };
    const color = colors[iconType];
    return {
      className: `flex items-center gap-1.5 px-3 py-1.5 bg-${color}-50/80 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 rounded-lg border border-${color}-200/60 dark:border-${color}-700/50 hover:bg-${color}-100/90 dark:hover:bg-${color}-800/40 hover:text-${color}-800 dark:hover:text-${color}-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm`,
    };
  };

  const muiTheme = React.useMemo(() => createBasicMuiTheme(isDarkMode), [isDarkMode]);

  return (
    <ThemeProvider theme={muiTheme}>
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
          ) : (
            <a href="http://agent-tars.com" target="blank" className="mr-3">
              <img src={logoUrl} alt={getAgentTitle()} className="w-6 h-6 rounded-lg" />
            </a>
          )}
        </div>

        {!isReplayMode && (
          <div className="ml-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 rounded-full transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? <GoSidebarCollapse size={20} /> : <GoSidebarExpand size={20} />}
            </motion.button>
          </div>
        )}

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
                    <motion.button
                      key={navItem.title}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavItemClick(navItem.link)}
                      className={className}
                      title={`Open ${navItem.title} in new tab`}
                    >
                      <IconComponent size={12} className="opacity-70" />
                      {navItem.title}
                    </motion.button>
                  );
                })}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAboutModal(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
              title={`About ${getAgentTitle()}`}
            >
              <FiInfo size={16} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
            </motion.button>

            {activeSessionId && !isReplayMode && (
              <ShareButton variant="navbar" disabled={isProcessing} />
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

            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={handleMobileMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{
                '& .MuiPaper-root': {
                  minWidth: 200,
                  mt: 1,
                  backgroundColor: isDarkMode
                    ? 'rgba(30, 41, 59, 0.95)'
                    : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(12px)',
                  border: isDarkMode
                    ? '1px solid rgba(71, 85, 105, 0.3)'
                    : '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: '12px',
                  boxShadow: isDarkMode
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                },
                '& .MuiMenuItem-root': {
                  color: isDarkMode ? 'rgba(226, 232, 240, 0.9)' : 'rgba(51, 65, 85, 0.9)',
                  '&:hover': {
                    backgroundColor: isDarkMode
                      ? 'rgba(71, 85, 105, 0.3)'
                      : 'rgba(241, 245, 249, 0.8)',
                  },
                },
                '& .MuiDivider-root': {
                  borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.6)',
                },
              }}
            >
              {!isReplayMode &&
                workspaceNavItems.length > 0 && [
                  ...workspaceNavItems.map((navItem) => {
                    const IconComponent = getNavItemIcon(navItem.icon);
                    return (
                      <MenuItem
                        key={navItem.title}
                        onClick={() => {
                          handleNavItemClick(navItem.link);
                          handleMobileMenuClose();
                        }}
                        sx={{ gap: 1.5 }}
                      >
                        <IconComponent size={16} style={{ opacity: 0.7 }} />
                        {navItem.title}
                      </MenuItem>
                    );
                  }),
                  <Divider key="divider" />,
                ]}

              <MenuItem
                onClick={() => {
                  setShowAboutModal(true);
                  handleMobileMenuClose();
                }}
                sx={{ gap: 1.5 }}
              >
                <FiInfo size={16} style={{ opacity: 0.7 }} />
                About {getAgentTitle()}
              </MenuItem>

              <MenuItem
                onClick={() => {
                  toggleDarkMode();
                  handleMobileMenuClose();
                }}
                sx={{ gap: 1.5 }}
              >
                {isDarkMode ? (
                  <FiSun size={16} style={{ opacity: 0.7 }} />
                ) : (
                  <FiMoon size={16} style={{ opacity: 0.7 }} />
                )}
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </MenuItem>

              {activeSessionId && !isReplayMode && (
                <MenuItem
                  onClick={() => {
                    handleMobileMenuClose();
                  }}
                  sx={{ gap: 1.5 }}
                >
                  <FiShare size={16} style={{ opacity: 0.7 }} />
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
    </ThemeProvider>
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
  const isDarkMode = useDarkMode();

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

  const agentMaxWidth = hasSpace
    ? 'none'
    : `${Math.max((agentTextWidth / totalTextWidth) * availableWidth * 0.85, 120)}px`;

  const modelMaxWidth = hasSpace
    ? 'none'
    : `${Math.max((modelTextWidth / totalTextWidth) * availableWidth * 0.85, 180)}px`;

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 min-w-0"
      style={{ maxWidth: '100%' }}
    >
      {sessionMetadata?.agentInfo?.name && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            py: 0.375,
            height: '28px',
            minHeight: '28px',

            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 50%, rgba(168, 85, 247, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(168, 85, 247, 0.08) 100%)',
            backdropFilter: 'blur(8px)',
            border: isDarkMode
              ? '1px solid rgba(139, 92, 246, 0.25)'
              : '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: '8px',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: '8px',
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 50%, rgba(168, 85, 247, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 50%, rgba(168, 85, 247, 0.03) 100%)',
              zIndex: -1,
            },
            '&:hover': {
              background: isDarkMode
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 50%, rgba(168, 85, 247, 0.25) 100%)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 50%, rgba(168, 85, 247, 0.12) 100%)',
              border: isDarkMode
                ? '1px solid rgba(139, 92, 246, 0.35)'
                : '1px solid rgba(99, 102, 241, 0.25)',
              boxShadow: isDarkMode
                ? '0 2px 8px -1px rgba(99, 102, 241, 0.15)'
                : '0 2px 8px -1px rgba(99, 102, 241, 0.08)',
            },
          }}
        >
          <FiZap size={12} color={isDarkMode ? '#a5b4fc' : '#6366f1'} style={{ flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '12px',
              color: isDarkMode ? '#e0e7ff' : '#4338ca',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={sessionMetadata.agentInfo.name}
          >
            {sessionMetadata.agentInfo.name}
          </Typography>
        </Box>
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
