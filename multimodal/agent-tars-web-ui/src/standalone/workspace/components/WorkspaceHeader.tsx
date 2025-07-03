import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiBookOpen } from 'react-icons/fi';
import { formatTimestamp } from '@/common/utils/formatters';
import { useTool } from '@/common/hooks/useTool';
import { StandardPanelContent } from '../types/panelContent';

interface WorkspaceHeaderProps {
  panelContent: StandardPanelContent;
  onBack: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({ panelContent, onBack }) => {
  const { getToolIcon } = useTool();

  const isResearchReport = panelContent.toolCallId?.startsWith('final-answer');

  return (
    <div className="flex items-center justify-between p-5 border-b border-gray-100/60 dark:border-gray-700/30 bg-white dark:bg-gray-800/90">
      <div className="flex items-center">
        <motion.button
          whileHover={{ scale: 1.05, x: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 rounded-lg border border-transparent hover:border-gray-100/70 dark:hover:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/50"
          title="Back to workspace"
        >
          <FiArrowLeft size={18} />
        </motion.button>

        <div className="w-10 h-10 mr-4 rounded-xl flex items-center justify-center overflow-hidden relative">
          {isResearchReport ? (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-accent-500/10 dark:from-accent-600/30 dark:to-accent-500/20" />
              <div className="relative z-10">
                <FiBookOpen className="text-accent-600 dark:text-accent-400" size={20} />
              </div>
            </>
          ) : (
            <>
              <div className={`absolute inset-0 ${getBackgroundGradient(panelContent.type)}`} />
              <div className="relative z-10">{getToolIcon(panelContent.type || 'other')}</div>
            </>
          )}
        </div>

        <div>
          <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
            {panelContent.title}
          </h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(panelContent.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
};

function getBackgroundGradient(type: string): string {
  const gradients: Record<string, string> = {
    search:
      'bg-gradient-to-br from-blue-400/20 to-indigo-500/10 dark:from-blue-600/30 dark:to-indigo-500/20',
    browser:
      'bg-gradient-to-br from-purple-400/20 to-pink-500/10 dark:from-purple-600/30 dark:to-pink-500/20',
    command:
      'bg-gradient-to-br from-green-400/20 to-emerald-500/10 dark:from-green-600/30 dark:to-emerald-500/20',
    file: 'bg-gradient-to-br from-yellow-400/20 to-amber-500/10 dark:from-yellow-600/30 dark:to-amber-500/20',
    image:
      'bg-gradient-to-br from-red-400/20 to-rose-500/10 dark:from-red-600/30 dark:to-rose-500/20',
    browser_vision_control:
      'bg-gradient-to-br from-cyan-400/20 to-teal-500/10 dark:from-cyan-600/30 dark:to-teal-500/20',
  };

  return (
    gradients[type] ||
    'bg-gradient-to-br from-gray-400/20 to-gray-500/10 dark:from-gray-500/30 dark:to-gray-600/20'
  );
}
