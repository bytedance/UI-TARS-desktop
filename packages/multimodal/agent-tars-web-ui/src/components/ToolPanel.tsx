import React, { useEffect, useState } from 'react';
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
  FiClock,
  FiArrowLeft,
  FiExternalLink,
  FiDownload,
  FiMaximize2,
  FiMinimize2,
  FiArrowRight,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { ReplayController } from './ReplayController';

interface ToolPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { activeSessionId, toolResults, activePanelContent, setActivePanelContent } =
    useSessionStore();
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showReplayControls, setShowReplayControls] = useState(false);

  console.log('activeResults', activeResults);

  // When session changes, clear the selected result
  useEffect(() => {
    // 当有活跃会话并且有结果时显示回放控制器
    setShowReplayControls(!!activeSessionId && activeResults.length > 0);
  }, [activeSessionId, activeResults.length]);

  // Get latest tool result - for streaming updates
  const getLatestResult = () => {
    if (activeResults.length === 0) return null;
    return activeResults[activeResults.length - 1];
  };

  // Show latest result by default if none selected
  useEffect(() => {
    if (activeSessionId && !activePanelContent && activeResults.length > 0) {
      const latestResult = getLatestResult();
      if (latestResult) {
        setActivePanelContent({
          type: latestResult.type,
          source: latestResult.content,
          title: latestResult.name,
          timestamp: latestResult.timestamp,
          toolCallId: latestResult.toolCallId,
          error: latestResult.error,
        });
      }
    }
  }, [activeSessionId, activeResults, activePanelContent, setActivePanelContent]);

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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={`data:image/png;base64,${content.data}`}
                alt="Generated image"
                className="max-w-full max-h-[80vh] rounded-2xl border border-gray-200/40 dark:border-gray-700/30 object-contain"
              />
              <div className="mt-4 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiDownload size={12} />
                  <span>Download</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <FiMinimize2 size={12} /> : <FiMaximize2 size={12} />}
                  <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
                </motion.button>
              </div>
            </motion.div>
          );
        } else if (typeof content === 'string' && content.startsWith('data:image/')) {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                src={content}
                alt="Image"
                className="max-w-full max-h-[80vh] rounded-2xl border border-gray-200/40 dark:border-gray-700/30 object-contain"
              />
              <div className="mt-4 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiDownload size={12} />
                  <span>Download</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <FiMinimize2 size={12} /> : <FiMaximize2 size={12} />}
                  <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
                </motion.button>
              </div>
            </motion.div>
          );
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
            <div className="flex flex-col h-full">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <motion.img
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  src={imgSrc}
                  alt="Browser screenshot"
                  className="max-w-full rounded-xl border border-gray-200/40 dark:border-gray-700/30 mb-2 object-contain"
                />
                <div className="mt-auto">
                  {typeof content === 'object' && content.title && (
                    <div className="text-sm font-medium mt-2">{content.title}</div>
                  )}
                  {typeof content === 'object' && content.url && (
                    <div className="flex items-center gap-1 mt-1">
                      <a
                        href={content.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-500 dark:text-primary-400 hover:underline truncate flex items-center gap-1 group"
                      >
                        {content.url}
                        <FiExternalLink
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="mt-4 flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiDownload size={12} />
                  <span>Download</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <FiMinimize2 size={12} /> : <FiMaximize2 size={12} />}
                  <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
                </motion.button>
              </div>
            </div>
          );
        }

        // For multimodal content (array)
        if (Array.isArray(content)) {
          return (
            <div className="space-y-4">
              {content.map((item, index) => {
                if (item.type === 'text') {
                  return (
                    <motion.div
                      key={index}
                      className="mb-3"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                    >
                      {item.text}
                    </motion.div>
                  );
                } else if (item.type === 'image_url') {
                  return (
                    <motion.img
                      key={index}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      src={item.image_url.url}
                      alt={item.image_url.alt || 'Browser content'}
                      className="max-w-full rounded-xl border border-gray-200/40 dark:border-gray-700/30 mb-3"
                    />
                  );
                }
                return null;
              })}
            </div>
          );
        }

        return (
          <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        );

      case 'search':
        // Handle search results
        if (Array.isArray(content)) {
          // Check if this is multimodal content
          if (content.length > 0 && content[0].type) {
            return content.map((item, index) => {
              if (item.type === 'text') {
                return (
                  <motion.div
                    key={index}
                    className="mb-3"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    {item.text}
                  </motion.div>
                );
              }
              return null;
            });
          }

          // Standard search results
          return (
            <div className="space-y-4">
              {content.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="border-b border-gray-200/40 dark:border-gray-700/30 pb-3 last:border-0 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 p-2 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.snippet}
                  </div>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-500 dark:text-primary-400 hover:underline truncate block mt-1 flex items-center gap-1 group"
                    >
                      {item.link}
                      <FiExternalLink
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        );

      case 'command':
        // Handle command output
        if (typeof content === 'string') {
          return (
            <pre className="bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl text-sm font-mono overflow-x-auto border border-gray-200/40 dark:border-gray-700/30">
              {content}
            </pre>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        );

      case 'file':
        // Handle file content
        if (typeof content === 'string') {
          return (
            <pre className="bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl text-sm font-mono overflow-x-auto border border-gray-200/40 dark:border-gray-700/30">
              {content}
            </pre>
          );
        } else if (typeof content === 'object' && content.content) {
          return (
            <div>
              <div className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">
                {content.filename || content.path || 'File'}
              </div>
              <pre className="bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl text-sm font-mono overflow-x-auto border border-gray-200/40 dark:border-gray-700/30">
                {content.content}
              </pre>
            </div>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        );

      default:
        // Default rendering for other tools
        if (Array.isArray(content)) {
          return content.map((item, index) => {
            if (item.type === 'text') {
              return (
                <motion.div
                  key={index}
                  className="mb-3"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.1 }}
                >
                  {item.text}
                </motion.div>
              );
            } else if (item.type === 'image_url') {
              return (
                <motion.img
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  src={item.image_url.url}
                  alt={item.image_url.alt || 'Content'}
                  className="max-w-full rounded-xl border border-gray-200/40 dark:border-gray-700/30 mb-3"
                />
              );
            }
            return null;
          });
        }

        return (
          <pre className="whitespace-pre-wrap text-sm bg-gray-50/80 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-200/40 dark:border-gray-700/30 overflow-auto">
            {JSON.stringify(content, null, 2)}
          </pre>
        );
    }
  };

  // Collapsed panel view
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col justify-between">
        <div className="flex justify-center py-4">
          <span className="writing-vertical-lr text-xs text-gray-500 font-medium uppercase tracking-wider">
            Result View
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggleCollapse}
          className="mt-auto mb-4 flex justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200"
          title="Expand panel"
        >
          <FiChevronLeft />
        </motion.button>

        {/* 添加回放控制器到折叠面板 */}
        <ReplayController isVisible={showReplayControls} />
      </div>
    );
  }

  // Timeline thumbnails at the bottom
  const renderTimeline = () => {
    if (activeResults.length <= 1) return null;

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
  };

  // Active content view
  if (activePanelContent) {
    return (
      <div
        className={`flex-1 overflow-y-auto h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6' : 'p-4'}`}
      >
        <div className="mb-4 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100/80 dark:bg-gray-800/80 flex items-center justify-center border border-gray-200/40 dark:border-gray-700/30">
              {getToolIcon(activePanelContent.type)}
            </div>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {activePanelContent.title}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(activePanelContent.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center">
            {activeResults.length > 1 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActivePanelContent(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg transition-all duration-200"
                title="Show timeline"
              >
                <FiArrowLeft />
              </motion.button>
            )}
            {!isFullscreen && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleCollapse}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg ml-1 transition-all duration-200"
                title="Collapse panel"
              >
                <FiChevronRight />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg ml-1 transition-all duration-200"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </motion.button>
          </div>
        </div>

        {activePanelContent.error ? (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 text-red-500 bg-red-50/60 dark:bg-red-900/10 rounded-xl border border-red-100/40 dark:border-red-800/20"
          >
            {activePanelContent.error}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanelContent.toolCallId || activePanelContent.timestamp}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-1 overflow-auto p-1"
            >
              {renderContent(activePanelContent.source, activePanelContent.type)}
            </motion.div>
          </AnimatePresence>
        )}

        {!isFullscreen && renderTimeline()}

        {/* 添加回放控制器到内容视图 */}
        <ReplayController isVisible={showReplayControls} />
      </div>
    );
  }

  // Tool results history view - redesigned as a timeline
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-800 dark:text-gray-200">Result Timeline</h3>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onToggleCollapse}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg transition-all duration-200"
            title="Collapse panel"
          >
            <FiChevronRight />
          </motion.button>
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

      {/* 回放控制器 - 已存在 */}
      <ReplayController isVisible={showReplayControls} />
    </>
  );
};
