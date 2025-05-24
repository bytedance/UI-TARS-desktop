import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from '../../hooks/useSession';
import { useTool } from '../../hooks/useTool';
import {
  FiArrowLeft,
  FiMaximize2,
  FiX,
  FiLayout,
  FiChevronRight,
  FiImage,
  FiFile,
  FiSearch,
  FiMonitor,
  FiTerminal,
  FiDownload,
} from 'react-icons/fi';
import { formatTimestamp } from '../../utils/formatters';
import { Markdown } from '../Common/Markdown';

interface WorkspaceDetailProps {
  onToggleCollapse: () => void;
}

/**
 * WorkspaceDetail Component - Displays details of a single tool result
 *
 * Provides:
 * - Detailed view of tool execution results
 * - Back button to return to list view
 * - Content type-specific rendering
 */
export const WorkspaceDetail: React.FC<WorkspaceDetailProps> = ({ onToggleCollapse }) => {
  const { activePanelContent, setActivePanelContent, toolResults, activeSessionId } = useSession();
  const { getToolIcon } = useTool();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  if (!activePanelContent) {
    return null;
  }

  const handleBackToList = () => {
    setActivePanelContent(null);
  };

  // Render content based on type
  const renderContent = () => {
    const { type, source, error } = activePanelContent;

    if (error) {
      return (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800/20">
          <div className="font-medium mb-2">Error</div>
          <div className="text-sm whitespace-pre-wrap font-mono">{error}</div>
        </div>
      );
    }

    switch (type) {
      case 'image':
        return (
          <div className="flex justify-center p-4">
            <img
              src={source}
              alt={activePanelContent.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg border border-gray-200/50 dark:border-gray-700/50"
            />
          </div>
        );

      case 'search':
        return (
          <div className="p-4 space-y-4">
            {Array.isArray(source.results) &&
              source.results.map((result: any, idx: number) => (
                <div
                  key={idx}
                  className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50"
                >
                  <h3 className="font-medium text-blue-600 dark:text-blue-400 mb-1 text-sm">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {result.title}
                    </a>
                  </h3>
                  <p className="text-xs text-gray-400 mb-2">{result.url}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{result.snippet}</p>
                </div>
              ))}
          </div>
        );

      case 'command':
        return (
          <div className="p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Command:</div>
            <div className="p-2 bg-gray-800 text-gray-100 rounded-md font-mono text-sm mb-4">
              {source.command}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Output:</div>
            <div className="p-2 bg-gray-800 text-gray-100 rounded-md font-mono text-sm overflow-auto max-h-[50vh]">
              <pre>{source.output}</pre>
            </div>
          </div>
        );

      case 'browser':
        return (
          <div className="p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">URL:</div>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm mb-4">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {source.url}
              </a>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Content:</div>
            <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 max-h-[50vh] overflow-auto">
              <Markdown>{source.content || source.text || 'No content available'}</Markdown>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">File:</div>
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm mb-4">
              {source.path || 'Unknown file'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Content:</div>
            <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-4 max-h-[50vh] overflow-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {source.content || 'No content available'}
              </pre>
            </div>
          </div>
        );

      default:
        if (typeof source === 'object') {
          return (
            <div className="p-4">
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl overflow-auto max-h-[70vh] text-sm font-mono">
                {JSON.stringify(source, null, 2)}
              </pre>
            </div>
          );
        }
        return (
          <div className="p-4">
            <Markdown>{String(source)}</Markdown>
          </div>
        );
    }
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
      {/* Header with tool info and actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/30 dark:border-gray-700/20">
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBackToList}
            className="mr-3 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/40 rounded-lg"
            title="Back to list"
          >
            <FiArrowLeft size={16} />
          </motion.button>

          <div className="w-8 h-8 mr-3 rounded-lg bg-gray-100/80 dark:bg-gray-700/80 flex items-center justify-center text-primary-500 dark:text-primary-400">
            {getToolIcon(activePanelContent.type)}
          </div>

          <div>
            <h2 className="font-medium text-gray-800 dark:text-gray-200 text-lg leading-tight">
              {activePanelContent.title}
            </h2>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(activePanelContent.timestamp)}
            </div>
          </div>
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

      {/* Content area */}
      <div className="flex-1 overflow-auto">{renderContent()}</div>

      {/* Footer with info text only */}
      <div className="p-4 border-t border-gray-200/30 dark:border-gray-700/20 flex justify-between items-center">
        <div className="text-xs text-gray-500 dark:text-gray-400">Tool result details</div>
      </div>
    </motion.div>
  );
};
