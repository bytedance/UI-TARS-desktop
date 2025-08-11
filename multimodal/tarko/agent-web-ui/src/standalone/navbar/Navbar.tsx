import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShareButton } from '@/standalone/share';
import { AboutModal } from './AboutModal';
import { motion } from 'framer-motion';
import { FiMoon, FiSun, FiInfo, FiCpu, FiFolder } from 'react-icons/fi';
import { GoSidebarCollapse, GoSidebarExpand } from 'react-icons/go';
import { FaBrain } from 'react-icons/fa';
import { useLayout } from '@/common/hooks/useLayout';
import { useSession } from '@/common/hooks/useSession';
import { useReplayMode } from '@/common/hooks/useReplayMode';

import './Navbar.css';

export const Navbar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useLayout();
  const { activeSessionId, isProcessing, modelInfo, agentInfo, workspaceInfo } = useSession();
  const { isReplayMode } = useReplayMode();
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [showAboutModal, setShowAboutModal] = React.useState(false);

  // Get configuration from global window object
  const webUIConfig = window.AGENT_WEB_UI_CONFIG;
  const logoUrl =
    webUIConfig?.logo ||
    'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png';

  // Get logo type from URL query parameter
  const logoType = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const logoParam = params.get('logo');
    return logoParam === 'agent-tars' ? 'agent-tars' : 'traffic-lights';
  }, []);

  // Initialize theme based on localStorage or document class
  useEffect(() => {
    // Get saved preference from localStorage
    const savedTheme = localStorage.getItem('agent-tars-theme');

    // Determine initial theme state (preference or document class)
    const initialIsDark =
      savedTheme === 'light'
        ? false
        : savedTheme === 'dark'
          ? true
          : document.documentElement.classList.contains('dark');

    // Update state with initial value
    setIsDarkMode(initialIsDark);

    // Ensure the document class matches the state
    document.documentElement.classList.toggle('dark', initialIsDark);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);

    // Save preference to localStorage
    localStorage.setItem('agent-tars-theme', newMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <>
      <div className="h-12 backdrop-blur-sm flex items-center px-3 flex-shrink-0">
        {/* Left section with conditional logo rendering */}
        <div className="flex items-center">
          {logoType === 'traffic-lights' ? (
            /* macOS-style traffic lights */
            <div className="flex space-x-1.5 mr-3">
              <div className="traffic-light traffic-light-red" />
              <div className="traffic-light traffic-light-yellow" />
              <div className="traffic-light traffic-light-green" />
            </div>
          ) : (
            /* Agent TARS logo with configurable URL */
            <a href="http://agent-tars.com" target="blank" className="mr-3">
              <img src={logoUrl} alt="Agent TARS" className="w-6 h-6 rounded-lg" />
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

        {/* Center section - Enhanced Workspace, Agent and Model info display with dynamic sizing */}
        <DynamicNavbarCenter
          workspaceInfo={workspaceInfo}
          agentInfo={agentInfo}
          modelInfo={modelInfo}
        />

        {/* Right section - reordered buttons: About, Dark mode, Share */}
        <div className="flex items-center space-x-1 md:space-x-2">
          {/* About button - moved to first position */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAboutModal(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
            title="About Agent TARS"
          >
            <FiInfo size={16} />
          </motion.button>

          {/* Dark mode toggle - moved to second position */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/40 dark:hover:bg-gray-800/40 transition-colors"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
          </motion.button>

          {/* Share button - moved to last position */}
          {activeSessionId && !isProcessing && !isReplayMode && <ShareButton variant="navbar" />}
        </div>
      </div>

      {/* About Modal - pass modelInfo and agentInfo */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        modelInfo={modelInfo}
        agentInfo={agentInfo}
      />
    </>
  );
};

// Dynamic Navbar Center Component with space optimization
interface DynamicNavbarCenterProps {
  workspaceInfo: { name?: string; path?: string };
  agentInfo: { name?: string };
  modelInfo: { model?: string; provider?: string };
}

const DynamicNavbarCenter: React.FC<DynamicNavbarCenterProps> = ({
  workspaceInfo,
  agentInfo,
  modelInfo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [workspaceTextWidth, setWorkspaceTextWidth] = useState(0);
  const [agentTextWidth, setAgentTextWidth] = useState(0);
  const [modelTextWidth, setModelTextWidth] = useState(0);

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

      if (workspaceInfo.name && workspaceInfo.name !== 'Unknown') {
        setWorkspaceTextWidth(measureText(workspaceInfo.name, 'font-medium'));
      }

      if (agentInfo.name) {
        setAgentTextWidth(measureText(agentInfo.name, 'font-medium'));
      }

      if (modelInfo.model || modelInfo.provider) {
        const modelText = [modelInfo.model, modelInfo.provider].filter(Boolean).join(' • ');
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
  }, [workspaceInfo.name, agentInfo.name, modelInfo.model, modelInfo.provider]);

  // Calculate dynamic widths for badges
  const totalTextWidth = workspaceTextWidth + agentTextWidth + modelTextWidth;
  const hasSpace = totalTextWidth <= availableWidth;

  // If we have space, use natural widths; otherwise, distribute proportionally
  const workspaceMaxWidth = hasSpace
    ? 'none'
    : `${Math.max((workspaceTextWidth / totalTextWidth) * availableWidth * 0.85, 100)}px`;

  const agentMaxWidth = hasSpace
    ? 'none'
    : `${Math.max((agentTextWidth / totalTextWidth) * availableWidth * 0.85, 80)}px`;

  const modelMaxWidth = hasSpace
    ? 'none'
    : `${Math.max((modelTextWidth / totalTextWidth) * availableWidth * 0.85, 100)}px`;

  return (
    <div ref={containerRef} className="flex-1 flex justify-center min-w-0">
      <div className="flex items-center gap-3 min-w-0" style={{ maxWidth: '100%' }}>
        {/* Workspace Badge */}
        {workspaceInfo.name && workspaceInfo.name !== 'Unknown' && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-400/15 dark:to-emerald-400/15 border border-green-200/30 dark:border-green-400/20 rounded-full shadow-sm backdrop-blur-sm min-w-0"
            style={{ maxWidth: workspaceMaxWidth }}
          >
            <FiFolder size={12} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span
              className={`text-xs font-medium text-green-800 dark:text-green-200 ${!hasSpace ? 'truncate' : ''}`}
              title={workspaceInfo.path || workspaceInfo.name}
            >
              {workspaceInfo.name}
            </span>
          </div>
        )}

        {/* Agent Name Badge */}
        {agentInfo.name && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-400/15 dark:to-purple-400/15 border border-blue-200/30 dark:border-blue-400/20 rounded-full shadow-sm backdrop-blur-sm min-w-0"
            style={{ maxWidth: agentMaxWidth }}
          >
            <FaBrain size={12} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span
              className={`text-xs font-medium text-blue-800 dark:text-blue-200 ${!hasSpace ? 'truncate' : ''}`}
              title={agentInfo.name}
            >
              {agentInfo.name}
            </span>
          </div>
        )}

        {/* Model Info Badge */}
        {(modelInfo.model || modelInfo.provider) && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-400/15 dark:to-pink-400/15 border border-purple-200/30 dark:border-purple-400/20 rounded-full shadow-sm backdrop-blur-sm min-w-0"
            style={{ maxWidth: modelMaxWidth }}
          >
            <FiCpu size={12} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div className="flex items-center gap-1 text-xs min-w-0">
              {modelInfo.model && (
                <span
                  className={`font-medium text-purple-800 dark:text-purple-200 ${!hasSpace ? 'truncate' : ''}`}
                  title={modelInfo.model}
                >
                  {modelInfo.model}
                </span>
              )}
              {modelInfo.provider && modelInfo.model && (
                <span className="text-purple-500 dark:text-purple-400 flex-shrink-0">•</span>
              )}
              {modelInfo.provider && (
                <span
                  className={`text-purple-700 dark:text-purple-300 font-medium ${!hasSpace ? 'truncate' : ''}`}
                  title={modelInfo.provider}
                >
                  {modelInfo.provider}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
