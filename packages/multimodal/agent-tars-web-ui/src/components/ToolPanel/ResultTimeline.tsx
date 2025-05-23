import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiChevronRight, FiClock } from 'react-icons/fi';
import { ToolResult } from '../../types';
import { PanelContent } from '../../store/atoms/sessionAtoms';
import { getToolIcon } from './utils';

interface ResultTimelineProps {
  activeResults: ToolResult[];
  activePanelContent: PanelContent | null;
  setActivePanelContent: (content: PanelContent | null) => void;
  isStandalone?: boolean;
  onToggleCollapse?: () => void;
}

export const ResultTimeline: React.FC<ResultTimelineProps> = ({
  activeResults,
  activePanelContent,
  setActivePanelContent,
  isStandalone = false,
  onToggleCollapse,
}) => {
  if (!isStandalone) {
    // Render as thumbnails at bottom of result viewer
    return (
      <div className="flex gap-2 mt-4 overflow-x-auto pb-2 px-1">
        {activeResults.map((result) => (
          <motion.button
            key={result.id}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              setActivePanelContent({
                type: result.type,
                source: result.content,
                title: result.name,
                timestamp: result.timestamp,
                toolCallId: result.toolCallId,
                error: result.error,
              })
            }
            className={`flex-shrink-0 p-1 rounded-lg transition-all duration-200 ${
              activePanelContent?.toolCallId === result.toolCallId
                ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-700'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
            }`}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/40 dark:border-gray-700/30">
              {getToolIcon(result.type)}
            </div>
          </motion.button>
        ))}
      </div>
    );
  }

  // Render full timeline view
  return (
    <div className="flex-1 overflow-y-auto p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-800 dark:text-gray-200">Result Timeline</h3>
        {onToggleCollapse && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleCollapse}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg transition-all duration-200"
            title="Collapse panel"
          >
            <FiChevronRight />
          </motion.button>
        )}
      </div>

      {activeResults.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-10 italic">
          No results available yet
        </div>
      ) : (
        <div className="space-y-4 relative">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-5 bottom-0 w-0.5 bg-gray-200/50 dark:bg-gray-700/30 z-0"></div>

          {activeResults.map((result, index) => (
            <motion.button
              key={result.id}
              onClick={() =>
                setActivePanelContent({
                  type: result.type,
                  source: result.content,
                  title: result.name,
                  timestamp: result.timestamp,
                  toolCallId: result.toolCallId,
                  error: result.error,
                })
              }
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ x: 5 }}
              className="w-full text-left pl-8 pr-3 py-2.5 rounded-xl hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-all duration-200 flex items-start gap-3 relative z-10"
            >
              <div className="absolute left-1.5 top-2.5 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-primary-500 z-20">
                {getToolIcon(result.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate group flex items-center">
                  {result.name}
                  <FiArrowRight
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    size={14}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                  <FiClock className="mr-1" size={10} />
                  {new Date(result.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
