import React, { useEffect } from 'react';
import { useSessionStore } from '../store';
import { ToolResult } from '../types';
import {
  FiSearch,
  FiMonitor,
  FiTerminal,
  FiFile,
  FiImage,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface ToolPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { activeSessionId, toolResults, activePanelContent, setActivePanelContent } =
    useSessionStore();
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];

  // When session changes, clear the selected result
  useEffect(() => {
    if (!activeSessionId || activeResults.length === 0) {
      setActivePanelContent(null);
    }
  }, [activeSessionId, activeResults.length, setActivePanelContent]);

  if (!activeSessionId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No active session
      </div>
    );
  }

  const getToolIcon = (type: ToolResult['type']) => {
    switch (type) {
      case 'search':
        return <FiSearch />;
      case 'browser':
        return <FiMonitor />;
      case 'command':
        return <FiTerminal />;
      case 'file':
        return <FiFile />;
      case 'image':
        return <FiImage />;
      default:
        return <FiFile />;
    }
  };

  const renderContent = (content: any, type: string) => {
    if (!content) return <div>No content available</div>;

    switch (type) {
      case 'image':
        // Handle image content
        if (typeof content === 'object' && content.type === 'image') {
          return (
            <img
              src={`data:image/png;base64,${content.data}`}
              alt="Generated image"
              className="max-w-full rounded-lg shadow-sm"
            />
          );
        } else if (typeof content === 'string' && content.startsWith('data:image/')) {
          return <img src={content} alt="Image" className="max-w-full rounded-lg shadow-sm" />;
        }
        return <div>Unsupported image format</div>;

      case 'browser':
        // Handle screenshot or browser results
        if (
          (typeof content === 'object' && content.screenshot) ||
          (typeof content === 'string' && content.startsWith('data:image/'))
        ) {
          const imgSrc = typeof content === 'object' ? content.screenshot : content;

          return (
            <div>
              <img
                src={imgSrc}
                alt="Browser screenshot"
                className="max-w-full rounded-lg shadow-sm mb-2"
              />
              {typeof content === 'object' && content.title && (
                <div className="text-sm font-medium">{content.title}</div>
              )}
              {typeof content === 'object' && content.url && (
                <div className="text-xs text-gray-500 truncate">
                  <a href={content.url} target="_blank" rel="noopener noreferrer">
                    {content.url}
                  </a>
                </div>
              )}
            </div>
          );
        }

        // For multimodal content (array)
        if (Array.isArray(content)) {
          return content.map((item, index) => {
            if (item.type === 'text') {
              return (
                <div key={index} className="mb-3">
                  {item.text}
                </div>
              );
            } else if (item.type === 'image_url') {
              return (
                <img
                  key={index}
                  src={item.image_url.url}
                  alt={item.image_url.alt || 'Browser content'}
                  className="max-w-full rounded-lg shadow-sm mb-3"
                />
              );
            }
            return null;
          });
        }

        return (
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
        );

      case 'search':
        // Handle search results
        if (Array.isArray(content)) {
          // Check if this is multimodal content
          if (content.length > 0 && content[0].type) {
            return content.map((item, index) => {
              if (item.type === 'text') {
                return (
                  <div key={index} className="mb-3">
                    {item.text}
                  </div>
                );
              }
              return null;
            });
          }

          // Standard search results
          return (
            <div className="space-y-4">
              {content.map((item, i) => (
                <div
                  key={i}
                  className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0"
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{item.snippet}</div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline truncate block mt-1"
                    >
                      {item.link}
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
        );

      case 'command':
        // Handle command output
        if (typeof content === 'string') {
          return (
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm font-mono overflow-x-auto">
              {content}
            </pre>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
        );

      case 'file':
        // Handle file content
        if (typeof content === 'string') {
          return (
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm font-mono overflow-x-auto">
              {content}
            </pre>
          );
        } else if (typeof content === 'object' && content.content) {
          return (
            <div>
              <div className="text-sm font-medium mb-2">
                {content.filename || content.path || 'File'}
              </div>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm font-mono overflow-x-auto">
                {content.content}
              </pre>
            </div>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
        );

      default:
        // Default rendering for other tools
        if (Array.isArray(content)) {
          return content.map((item, index) => {
            if (item.type === 'text') {
              return (
                <div key={index} className="mb-3">
                  {item.text}
                </div>
              );
            } else if (item.type === 'image_url') {
              return (
                <img
                  key={index}
                  src={item.image_url.url}
                  alt={item.image_url.alt || 'Content'}
                  className="max-w-full rounded-lg shadow-sm mb-3"
                />
              );
            }
            return null;
          });
        }

        return (
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content, null, 2)}</pre>
        );
    }
  };

  // Collapsed panel view
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col justify-between">
        <div className="flex justify-center py-4">
          <span className="writing-vertical-lr text-xs text-gray-500 font-medium uppercase">
            Tool Results
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="mt-auto mb-4 flex justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Expand panel"
        >
          <FiChevronLeft />
        </button>
      </div>
    );
  }

  // Active content view
  if (activePanelContent) {
    return (
      <div className="flex-1 overflow-y-auto p-4 h-full">
        <div className="mb-4 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {getToolIcon(activePanelContent.type)}
            <span className="font-medium">{activePanelContent.title}</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setActivePanelContent(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
              title="Close"
            >
              <FiX />
            </button>
            <button
              onClick={onToggleCollapse}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 ml-1"
              title="Collapse panel"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        {activePanelContent.error ? (
          <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
            {activePanelContent.error}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanelContent.toolCallId || activePanelContent.timestamp}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent(activePanelContent.source, activePanelContent.type)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    );
  }

  // Tool results list view
  return (
    <div className="flex-1 overflow-y-auto p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Tool Results</h3>
        <button
          onClick={onToggleCollapse}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
          title="Collapse panel"
        >
          <FiChevronRight />
        </button>
      </div>

      {activeResults.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-10">
          No tool results available
        </div>
      ) : (
        <div className="space-y-2">
          {activeResults.map((result) => (
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full text-left p-3 rounded-md bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
            >
              <div className="text-primary-500">{getToolIcon(result.type)}</div>
              <div className="overflow-hidden">
                <div className="font-medium truncate">{result.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
