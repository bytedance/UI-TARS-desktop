import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiBookOpen, FiMaximize, FiEye, FiCode } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { useTool } from '@/common/hooks/useTool';
import { normalizeFilePath } from '@/common/utils/pathNormalizer';
import { StandardPanelContent } from '../types/panelContent';
import { ToggleSwitch, ToggleSwitchProps } from '../renderers/generic/components/ToggleSwitch';
import { ShareButton } from './ShareButton';
import { FileDisplayMode } from '../types';
import { WorkspaceDisplayMode } from '@/common/state/atoms/workspace';


interface WorkspaceHeaderProps {
  panelContent: StandardPanelContent;
  onBack: () => void;
  showToggle?: boolean;
  toggleConfig?: ToggleSwitchProps<FileDisplayMode>;
  showFullscreen?: boolean;
  onFullscreen?: () => void;
  // New props for workspace display mode
  workspaceDisplayMode?: WorkspaceDisplayMode;
  onWorkspaceDisplayModeChange?: (mode: WorkspaceDisplayMode) => void;
  showWorkspaceToggle?: boolean;
  isReplayMode?: boolean;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  panelContent,
  onBack,
  showToggle = false,
  toggleConfig,
  showFullscreen = false,
  onFullscreen,
  workspaceDisplayMode = 'interaction',
  onWorkspaceDisplayModeChange,
  showWorkspaceToggle = false,
  isReplayMode = false,
}) => {
  const { getToolIcon } = useTool();

  const isResearchReport = panelContent.toolCallId?.startsWith('final-answer');

  // Extract file name for share functionality with normalized path
  const getFileName = (): string => {
    if (panelContent.arguments?.path) {
      const normalizedPath = normalizeFilePath(panelContent.arguments.path);
      return normalizedPath.split(/[/\\]/).pop() || normalizedPath;
    }
    return panelContent.title;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 workspace-control-panel">
      <div className="flex items-center min-w-0 flex-1">
        {/* Back button - more compact and subtle */}
        <motion.button
          whileHover={{ scale: 1.02, x: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="mr-3 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-md transition-all duration-150"
          title="Back to workspace"
        >
          <FiArrowLeft size={16} />
        </motion.button>

        {/* Icon - smaller and more refined */}
        <div className="w-7 h-7 mr-3 rounded-lg flex items-center justify-center overflow-hidden relative flex-shrink-0 shadow-sm ring-1 ring-gray-200/50 dark:ring-gray-700/30">
          {isResearchReport ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-accent-50 to-accent-100/50 dark:from-accent-900/30 dark:to-accent-800/20" />
              <div className="relative z-10">
                <FiBookOpen className="text-accent-600 dark:text-accent-400" size={14} />
              </div>
            </>
          ) : (
            <>
              <div className={`absolute inset-0 ${getBackgroundGradient(panelContent.type)}`} />
              <div className="relative z-10">{getToolIcon(panelContent.type || 'other', 14)}</div>
            </>
          )}
        </div>

        {/* Content info - more compact typography with normalized path display */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2 className="font-medium text-gray-900 dark:text-gray-100 text-base leading-tight truncate">
              {panelContent.title === 'browser_vision_control' ? 'Browser' : panelContent.title}
            </h2>
            <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0 font-mono">
              {formatTimestamp(panelContent.timestamp, true)}
            </div>
          </div>
          {/* Show normalized path if available */}
          {panelContent.arguments?.path && (
            <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate">
              {normalizeFilePath(panelContent.arguments.path)}
            </div>
          )}
        </div>
      </div>

      <div className="ml-4 flex-shrink-0 flex items-center gap-3">

        {/* Workspace display mode toggle */}
        {showWorkspaceToggle && onWorkspaceDisplayModeChange && (
          <ToggleSwitch<WorkspaceDisplayMode>
            value={workspaceDisplayMode}
            onChange={onWorkspaceDisplayModeChange}
            leftValue="interaction"
            rightValue="raw"
            leftLabel="UI"
            rightLabel="RAW"
            leftIcon={<FiEye size={12} />}
            rightIcon={<FiCode size={12} />}
          />
        )}

        {/* File display mode toggle */}
        {showToggle && toggleConfig && <ToggleSwitch<FileDisplayMode> {...toggleConfig} />}

        {/* Share button */}
        <ShareButton fileName={getFileName()} title="Share this file" />

        {/* Fullscreen button */}
        {showFullscreen && onFullscreen && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFullscreen}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Fullscreen preview"
          >
            <FiMaximize size={16} />
          </motion.button>
        )}
      </div>
    </div>
  );
};

function getBackgroundGradient(type: string): string {
  const gradients: Record<string, string> = {
    search:
      'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10',
    browser:
      'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10',
    command:
      'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10',
    file: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10',
    image: 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10',
    browser_vision_control:
      'bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-800/10',
  };

  return (
    gradients[type] ||
    'bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/20 dark:to-gray-700/10'
  );
}
