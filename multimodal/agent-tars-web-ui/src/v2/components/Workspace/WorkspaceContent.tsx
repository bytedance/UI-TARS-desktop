import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import { usePlan } from '../../hooks/usePlan';
import { TOOL_TYPES } from '../../constants';
import { usePro } from '../../hooks/usePro';
import {
  FiImage,
  FiFile,
  FiSearch,
  FiMonitor,
  FiTerminal,
  FiGrid,
  FiLayout,
  FiArrowRight,
  FiClock,
  FiCheck,
  FiX,
  FiCpu,
} from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';
import './Workspace.css';

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
 * Design principles:
 * - Clean monochromatic design with selective accent highlights
 * - Elegant card layout with subtle shadows and refined spacing
 * - Refined micro-interactions to enhance user experience
 * - Robust information hierarchy through typography and spacing
 */
export const WorkspaceContent: React.FC = () => {
  const { activeSessionId, toolResults, setActivePanelContent } = useSession();

  const { getToolIcon } = useTool();
  const { currentPlan } = usePlan(activeSessionId);
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('all');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const isProMode = usePro();

  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];

  // Filter results based on selected type
  const filteredResults = activeResults.filter((result) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'document') return result.type === 'file';
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

  // Animation variants
  const cardVariants = {
    initial: { y: 10, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.3 } },
    hover: {
      y: -4,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      transition: { duration: 0.2 },
    },
    exit: { y: -10, opacity: 0, transition: { duration: 0.2 } },
  };

  const emptyStateVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, delay: 0.1 },
    },
  };

  // Add Plan view button
  const renderPlanButton = () => {
    console.log('isProMode', isProMode);

    if (!isProMode) return null;

    if (!currentPlan || !currentPlan.hasGeneratedPlan || currentPlan.steps.length === 0)
      return null;

    const completedSteps = currentPlan.steps.filter((step) => step.done).length;
    const totalSteps = currentPlan.steps.length;
    const isComplete = currentPlan.isComplete;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <motion.div
          whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setActivePanelContent({
              type: 'plan',
              source: null,
              title: 'Task Plan',
              timestamp: Date.now(),
            })
          }
          className="bg-white dark:bg-gray-800 rounded-xl border border-[#E5E6EC] dark:border-gray-700/30 overflow-hidden cursor-pointer transition-all duration-200"
        >
          <div className="p-4">
            <div className="flex items-start">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 ${
                  isComplete
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100/50 dark:border-green-800/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-accent-500 dark:text-accent-400 border border-[#E5E6EC] dark:border-gray-700/30'
                }`}
              >
                {isComplete ? (
                  <FiCpu size={18} />
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FiCpu size={18} />
                  </motion.div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate pr-2">
                    Task Plan
                  </h4>
                  <motion.div
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <FiArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                  </motion.div>
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <FiClock size={12} className="mr-1" />
                  {isComplete ? 'Completed' : 'In progress'}
                </div>

                {/* Progress bar */}
                <div className="mt-3 mb-2">
                  <div className="flex justify-between items-center mb-1.5 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Progress</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isComplete
                          ? 'bg-gradient-to-r from-green-400 to-green-500'
                          : 'bg-gradient-to-r from-accent-400 to-accent-500'
                      }`}
                      style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 border-t border-[#E5E6EC] dark:border-gray-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs">
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isComplete
                      ? 'bg-green-500 dark:bg-green-400'
                      : 'bg-accent-500 dark:bg-accent-400'
                  }`}
                />
                <span className="text-gray-500 dark:text-gray-400">View plan details</span>
              </div>
              <div className="flex items-center text-xs">
                {isComplete ? (
                  <span className="text-gray-500 dark:text-gray-400 flex items-center">
                    <FiCheck size={12} className="mr-1 text-green-500 dark:text-green-400" />
                    Complete
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 flex items-center">
                    <FiClock size={12} className="mr-1" />
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header with title */}
      <div className="flex items-center px-6 py-4">
        <div className="w-8 h-8 mr-3 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-[#E5E6EC] dark:border-gray-700/30">
          <FiLayout size={16} />
        </div>
        <h2 className="font-medium text-gray-900 dark:text-gray-100 text-lg">Workspace</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center px-6 py-3 overflow-x-auto">
        {(['all', 'image', 'document', 'search', 'browser', 'terminal'] as ContentFilter[]).map(
          (filter) => (
            <motion.button
              key={filter}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(filter)}
              className={`flex items-center px-3 py-1.5 mr-3 rounded-lg text-sm transition-all duration-200 ${
                activeFilter === filter
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }`}
            >
              <span className="mr-2">{getFilterIcon(filter)}</span>
              <span className="capitalize">{filter}</span>
            </motion.button>
          ),
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {Object.entries(groupedResults).length === 0 ? (
            <motion.div
              key="empty-state"
              variants={emptyStateVariants}
              initial="initial"
              animate="animate"
              className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 text-center py-20"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4 border border-[#E5E6EC] dark:border-gray-700/30">
                {getFilterIcon(activeFilter)}
              </div>
              <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                No {activeFilter === 'all' ? 'items' : activeFilter + ' items'} yet
              </h3>
              <p className="text-sm max-w-md">
                Tool results will appear here as you interact with the agent.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {/* Plan card - add at the top */}
              {activeFilter === 'all' && renderPlanButton()}

              {Object.entries(groupedResults).map(([dateGroup, results]) => (
                <div key={dateGroup} className="mb-8">
                  <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    {dateGroup === 'today'
                      ? 'Today'
                      : dateGroup === 'yesterday'
                        ? 'Yesterday'
                        : 'Older'}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((result) => (
                      <motion.div
                        key={result.id}
                        variants={cardVariants}
                        initial="initial"
                        animate="animate"
                        whileHover="hover"
                        exit="exit"
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setHoveredItemId(result.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-[#E5E6EC] dark:border-gray-700/30 overflow-hidden cursor-pointer transition-all duration-200"
                      >
                        <div className="p-4">
                          <div className="flex items-start">
                            <div className="w-10 h-10 rounded-xl relative flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
                              {/* Add gradient background and shadow based on tool type */}
                              <div
                                className={`absolute inset-0 opacity-20 ${
                                  result.type === 'search'
                                    ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                                    : result.type === 'browser'
                                      ? 'bg-gradient-to-br from-purple-400 to-pink-500'
                                      : result.type === 'command'
                                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                        : result.type === 'file'
                                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                                          : result.type === 'image'
                                            ? 'bg-gradient-to-br from-red-400 to-rose-500'
                                            : result.type === 'browser_vision_control'
                                              ? 'bg-gradient-to-br from-cyan-400 to-teal-500'
                                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                }`}
                              ></div>
                              <div className="relative z-10 text-center">
                                {getToolIcon(result.type)}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 truncate pr-2">
                                  {result.name}
                                </h4>
                                <motion.div
                                  animate={{
                                    opacity: hoveredItemId === result.id ? 1 : 0,
                                    x: hoveredItemId === result.id ? 0 : 5,
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <FiArrowRight
                                    size={16}
                                    className="text-gray-400 dark:text-gray-500"
                                  />
                                </motion.div>
                              </div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <FiClock size={12} className="mr-1" />
                                {formatTimestamp(result.timestamp)}
                              </div>

                              {/* Conditional content preview based on type */}
                              {result.type === 'search' && (
                                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 rounded-md line-clamp-2">
                                  <span className="font-medium">Search:</span>{' '}
                                  {typeof result.content === 'string'
                                    ? result.content.substring(0, 100)
                                    : Array.isArray(result.content) &&
                                        result.content.some((p) => p.name === 'QUERY')
                                      ? result.content
                                          .find((p) => p.name === 'QUERY')
                                          ?.text?.substring(0, 100)
                                      : 'Search results'}
                                </div>
                              )}

                              {result.type === 'command' && (
                                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md line-clamp-1 font-mono">
                                  {typeof result.content === 'object'
                                    ? result.content.command || 'Command executed'
                                    : Array.isArray(result.content) &&
                                        result.content.some((p) => p.name === 'COMMAND')
                                      ? result.content.find((p) => p.name === 'COMMAND')?.text
                                      : 'Command executed'}
                                </div>
                              )}

                              {result.type === 'browser' && (
                                <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 flex items-center">
                                  <FiMonitor size={12} className="mr-1" />
                                  {typeof result.content === 'object' && result.content.url
                                    ? result.content.url.substring(0, 40) +
                                      (result.content.url.length > 40 ? '...' : '')
                                    : 'Browser navigation'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 border-t border-[#E5E6EC] dark:border-gray-700/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs">
                              <span
                                className={`w-2 h-2 rounded-full mr-1.5 ${
                                  result.error
                                    ? 'bg-gray-400 dark:bg-gray-500'
                                    : 'bg-gray-400 dark:bg-gray-500'
                                }`}
                              />
                              <span className="text-gray-500 dark:text-gray-400">
                                {result.type}
                              </span>
                            </div>
                            <div className="flex items-center text-xs">
                              {result.error ? (
                                <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                  <FiX size={12} className="mr-1" />
                                  Error
                                </span>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                  <FiCheck size={12} className="mr-1" />
                                  Success
                                </span>
                              )}
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
        </AnimatePresence>
      </div>
    </div>
  );
};
