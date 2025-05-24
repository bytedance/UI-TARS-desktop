import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import { TOOL_TYPES } from '../../constants';
import {
  FiImage,
  FiFile,
  FiSearch,
  FiMonitor,
  FiTerminal,
  FiGrid,
  FiMaximize2,
  FiX,
  FiLayout,
  FiChevronRight,
} from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';

interface WorkspaceContentProps {
  onToggleCollapse: () => void;
}

// Filter types for workspace content
type ContentFilter = 'all' | 'image' | 'document' | 'search' | 'terminal' | 'browser';

/**
 * Helper function to get icon for filter type
 */
function getFilterIcon(type: ContentFilter) {
  switch (type) {
    case 'all':
      return <FiGrid size={16} />;
    case 'image':
      return <FiImage size={16} />;
    case 'document':
      return <FiFile size={16} />;
    case 'search':
      return <FiSearch size={16} />;
    case 'browser':
      return <FiMonitor size={16} />;
    case 'terminal':
      return <FiTerminal size={16} />;
    default:
      return <FiGrid size={16} />;
  }
}

/**
 * WorkspaceContent Component - Displays tool results and allows filtering
 *
 * Provides:
 * - Filterable view of tool results
 * - Result details display
 * - Fullscreen mode
 */
export const WorkspaceContent: React.FC<WorkspaceContentProps> = ({ onToggleCollapse }) => {
  const { activeSessionId, toolResults, activePanelContent, setActivePanelContent } = useSession();
  const { getToolIcon } = useTool();
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];

  // Filter results based on selected type
  const filteredResults = activeResults.filter((result) => {
    if (activeFilter === 'all') return true;
    return result.type === activeFilter;
  });

  // Group results by date (today, yesterday, older)
  const groupResultsByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return filteredResults.reduce(
      (groups, result) => {
        const resultDate = new Date(result.timestamp);
        let group = 'older';

        if (resultDate >= today) {
          group = 'today';
        } else if (resultDate >= yesterday) {
          group = 'yesterday';
        }

        if (!groups[group]) groups[group] = [];
        groups[group].push(result);
        return groups;
      },
      {} as Record<string, typeof filteredResults>,
    );
  };

  const groupedResults = groupResultsByDate();

  // Handle clicking on a result item
  const handleResultClick = (result: any) => {
    setActivePanelContent({
      type: result.type,
      source: result.content,
      title: result.name,
      timestamp: result.timestamp,
      toolCallId: result.toolCallId,
      error: result.error,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`h-full flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6' : ''
      }`}
    >
      {/* Header with filters */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-gray-700/20">
        <div className="flex items-center">
          <div className="w-8 h-8 mr-3 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 flex items-center justify-center text-white shadow-sm">
            <FiLayout size={16} />
          </div>
          <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg">Workspace</h2>
        </div>

        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/40"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FiX /> : <FiMaximize2 />}
          </motion.button>

          {!isFullscreen && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleCollapse}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100/60 dark:hover:bg-gray-700/40"
              title="Collapse panel"
            >
              <FiChevronRight />
            </motion.button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center overflow-x-auto px-4 py-2 border-b border-gray-200/30 dark:border-gray-700/20">
        {(['all', 'image', 'document', 'search', 'browser', 'terminal'] as ContentFilter[]).map(
          (filter) => (
            <motion.button
              key={filter}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(filter)}
              className={`flex items-center px-3 py-1.5 mr-2 rounded-lg text-sm ${
                activeFilter === filter
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/40'
              }`}
            >
              <span className="mr-1.5">{getFilterIcon(filter)}</span>
              <span className="capitalize">{filter}</span>
            </motion.button>
          ),
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedResults).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center py-20">
            <div className="w-16 h-16 bg-gray-100/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center mb-4">
              {getToolIcon(activeFilter)}
            </div>
            <h3 className="text-lg font-medium mb-2">
              No {activeFilter === 'all' ? 'items' : activeFilter + ' items'} yet
            </h3>
            <p className="text-sm max-w-md">
              Items will appear here as you interact with the agent.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedResults).map(([dateGroup, results]) => (
              <div key={dateGroup} className="mb-8">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  {dateGroup === 'today'
                    ? 'Today'
                    : dateGroup === 'yesterday'
                      ? 'Yesterday'
                      : 'Older'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((result) => (
                    <motion.div
                      key={result.id}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleResultClick(result)}
                      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 border border-gray-200/30 dark:border-gray-700/20 cursor-pointer hover:border-primary-200/30 dark:hover:border-primary-700/30 transition-all duration-200"
                    >
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-lg bg-gray-100/80 dark:bg-gray-700/80 flex items-center justify-center text-primary-500 dark:text-primary-400 mr-3 flex-shrink-0">
                          {getToolIcon(result.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                            {result.name}
                          </h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimestamp(result.timestamp)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
