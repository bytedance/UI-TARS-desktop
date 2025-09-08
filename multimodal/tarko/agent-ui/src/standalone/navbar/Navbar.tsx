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

import {
  Box,
  Typography,
  createTheme,
  ThemeProvider,
  Menu,
  MenuItem,
  Divider,
  IconButton,
} from '@mui/material';
import { useLayout } from '@/common/hooks/useLayout';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';
import { useDarkMode } from '@/common/hooks/useDarkMode';
import { apiService } from '@/common/services/apiService';
import { NavbarModelSelector } from './ModelSelector';
import { getLogoUrl, getAgentTitle, getWorkspaceNavItems } from '@/config/web-ui-config';
import type { WorkspaceNavItemIcon } from '@tarko/interface';
import { getModelDisplayName } from '@/common/utils/modelUtils';

import './Navbar.css';

export const Navbar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { activeSessionId, isProcessing, sessionMetadata } = useSession();
  const { isReplayMode } = useReplayMode();
  const isDarkMode = useDarkMode();
  const [showAboutModal, setShowAboutModal] = React.useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = React.useState<null | HTMLElement>(null);
  const workspaceNavItems = getWorkspaceNavItems();

  // Update HTML title with workspace and agent info
  useEffect(() => {
    const updateTitle = () => {
      const parts = [];

      // Add agent name if available
      if (sessionMetadata?.agentInfo?.name) {
        parts.push(sessionMetadata.agentInfo.name);
      }

      // Create title with format: "dir | agent" or fallback to configured title
      const title = parts.length > 0 ? parts.join(' | ') : getAgentTitle();
      document.title = title;
    };

    updateTitle();
  }, [sessionMetadata?.agentInfo?.name]);

  // Get configuration from global window object
  const logoUrl = getLogoUrl();

  // Get logo type from URL query parameter
  const logoType = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const logoParam = params.get('logo');

    // Support three modes: logo (default), traffic-lights, space
    if (logoParam === 'traffic-lights') {
      return 'traffic-lights';
    } else if (logoParam === 'space') {
      return 'space';
    } else {
      return 'logo'; // Default to logo
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('agent-tars-theme', newMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Handle navigation item click
  const handleNavItemClick = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  // Handle mobile menu
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  // Icon mapping for workspace navigation items
  const getNavItemIcon = (iconType: WorkspaceNavItemIcon = 'default') => {
    const iconMap = {
      code: FiCode,
      monitor: FiMonitor,
      terminal: FiTerminal,
      browser: FiGlobe,
      desktop: MdDesktopWindows,
      default: FiSettings, // Default fallback icon
    };
    return iconMap[iconType];
  };

  // Get styling for nav item based on icon type
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
          'flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100/90 dark:hover:bg-slate-700/40 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 text-xs font-medium backdrop-blur-sm hover:shadow-sm',
      },
    };
    return styleMap[iconType];
  };

  // Create MUI theme for consistent styling
  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
        },
      }),
    [isDarkMode],
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <div className="h-12 backdrop-blur-sm flex items-center px-3 flex-shrink-0 relative">
        {/* Left section with conditional logo rendering */}
        <div className="flex items-center">
          {logoType === 'traffic-lights' ? (
            /* macOS-style traffic lights */
            <div className="flex space-x-1.5 mr-3">
              <div className="traffic-light traffic-light-red" />
              <div className="traffic-light traffic-light-yellow" />
              <div className="traffic-light traffic-light-green" />
            </div>
          ) : logoType === 'space' ? (
            /* Space for traffic lights - just the margin without content */
            <div className="mr-3" style={{ width: '54px' }} />
          ) : (
            /* Logo (default) */
            <a href="http://agent-tars.com" target="blank" className="mr-3">
              <img src={logoUrl} alt={getAgentTitle()} className="w-6 h-6 rounded-lg" />
            </a>
          )}
        </div>

        {/* Sidebar toggle button - positioned at the right edge aligned with Chat area */}
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

        {/* Center section - Agent and Model info display - absolutely positioned for true centering */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <DynamicNavbarCenter
            sessionMetadata={sessionMetadata}
            activeSessionId={activeSessionId}
          />
        </div>

        {/* Right section - workspace nav items, then About, Dark mode, Share */}
        <div className="flex items-center ml-auto relative">
          {/* Desktop view - show all buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Workspace navigation items */}
            {!isReplayMode && workspaceNavItems.length > 0 && (
              <div className="flex items-center gap-2 mr-2">
                {workspaceNavItems.map((navItem) => {
                  const IconComponent = getNavItemIcon(navItem.icon);
                  const { className } = getNavItemStyle(navItem.icon);
                  return (
                    <motion.button
                      // eslint-disable-next-line @secretlint/secretlint-rule-pattern
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
            {/* About button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAboutModal(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
              title={`About ${getAgentTitle()}`}
            >
              <FiInfo size={16} />
            </motion.button>

            {/* Dark mode toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
            </motion.button>

            {/* Share button */}
            {activeSessionId && !isReplayMode && (
              <ShareButton variant="navbar" disabled={isProcessing} />
            )}
          </div>

          {/* Mobile view - MUI dropdown menu */}
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
              {/* Workspace navigation items in dropdown */}
              {!isReplayMode &&
                workspaceNavItems.length > 0 && [
                  ...workspaceNavItems.map((navItem) => {
                    const IconComponent = getNavItemIcon(navItem.icon);
                    return (
                      <MenuItem
                        // eslint-disable-next-line @secretlint/secretlint-rule-pattern
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

              {/* About option */}
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

              {/* Dark mode toggle option */}
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

              {/* Share option */}
              {activeSessionId && !isReplayMode && (
                <MenuItem
                  onClick={() => {
                    // Handle share functionality here
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

      {/* About Modal - pass sessionMetadata */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        sessionMetadata={sessionMetadata}
      />
    </ThemeProvider>
  );
};

// Dynamic Navbar Center Component with space optimization
interface DynamicNavbarCenterProps {
  sessionMetadata?: {
    agentInfo?: { name: string;[key: string]: any };
    modelConfig?: { provider: string; modelId: string;[key: string]: any };
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

  // Calculate text widths and available space
  useEffect(() => {
    const calculateWidths = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.offsetWidth;

      // Reserve space for padding, gaps, icons, and badges
      const reservedSpace = 120; // Approximate space for icons, padding, gaps
      const available = Math.max(containerWidth - reservedSpace, 200);

      setAvailableWidth(available);

      // Calculate text widths using a temporary element
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

    // Recalculate on window resize
    const handleResize = () => {
      setTimeout(calculateWidths, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [
    sessionMetadata?.agentInfo?.name,
    sessionMetadata?.modelConfig?.modelId,
    sessionMetadata?.modelConfig?.displayName,
    sessionMetadata?.modelConfig?.provider,
  ]);

  // Calculate dynamic widths for badges
  const totalTextWidth = agentTextWidth + modelTextWidth;
  const hasSpace = totalTextWidth <= availableWidth;

  // If we have space, use natural widths; otherwise, distribute proportionally
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
      {/* Agent Name Badge - Enhanced with colorful gradient */}
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

            // Colorful gradient background for Agent
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

      {/* Model Selector - Interactive dropdown for model selection */}
      <NavbarModelSelector
        className="min-w-0"
        activeSessionId={activeSessionId}
        sessionMetadata={sessionMetadata}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
