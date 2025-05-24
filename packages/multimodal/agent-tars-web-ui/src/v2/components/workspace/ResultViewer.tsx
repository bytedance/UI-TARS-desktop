import React, { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { motion } from 'framer-motion';

/**
 * 结果查看器组件
 * 显示工具执行结果和其他工作区内容
 */
export const ResultViewer: React.FC<{ onToggleCollapse: () => void }> = ({ onToggleCollapse }) => {
  const { activePanelContent, setActivePanelContent, activeSessionId, toolResults } = useSession();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];

  // 获取最新工具结果 - 用于流式更新
  const getLatestResult = () => {
    if (activeResults.length === 0) return null;
    return activeResults[activeResults.length - 1];
  };

  // 默认显示最新结果
  React.useEffect(() => {
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

  // 如果有活动内容，渲染它
  if (activePanelContent) {
    return (
      <div
        className={`flex-1 overflow-y-auto h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6' : 'p-4'}`}
      >
        <div className="mb-4 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100/80 dark:bg-gray-800/80 flex items-center justify-center border border-gray-200/40 dark:border-gray-700/30">
              {getTypeIcon(activePanelContent.type)}
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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
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
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1.5 hover:bg-gray-100/70 dark:hover:bg-gray-700/40 rounded-lg ml-1 transition-all duration-200"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              )}
            </motion.button>
          </div>
        </div>

        <motion.div
          key={activePanelContent.toolCallId || activePanelContent.timestamp}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-auto p-1"
        >
          {renderContent(
            activePanelContent.source,
            activePanelContent.type,
            isFullscreen,
            setIsFullscreen,
            activePanelContent.error,
          )}
        </motion.div>

        {!isFullscreen && activeResults.length > 1 && (
          <ResultTimeline
            activeResults={activeResults}
            activePanelContent={activePanelContent}
            setActivePanelContent={setActivePanelContent}
          />
        )}
      </div>
    );
  }

  // 时间线视图（未选择特定结果）
  return (
    <ResultTimelineStandalone
      activeResults={activeResults}
      setActivePanelContent={setActivePanelContent}
      onToggleCollapse={onToggleCollapse}
    />
  );
};

// 获取类型图标
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'search':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      );
    case 'browser':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      );
    case 'command':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      );
    case 'file':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    case 'image':
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      );
    default:
      return (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
  }
};

// 简化版结果时间线
const ResultTimeline: React.FC<{
  activeResults: any[];
  activePanelContent: any;
  setActivePanelContent: (content: any) => void;
}> = ({ activeResults, activePanelContent, setActivePanelContent }) => {
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
            {getTypeIcon(result.type)}
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// 独立的结果时间线（全屏模式）
const ResultTimelineStandalone: React.FC<{
  activeResults: any[];
  setActivePanelContent: (content: any) => void;
  onToggleCollapse: () => void;
}> = ({ activeResults, setActivePanelContent, onToggleCollapse }) => {
  return (
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </motion.button>
      </div>

      {activeResults.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm text-center py-10 italic">
          No results available yet
        </div>
      ) : (
        <div className="space-y-4 relative">
          {/* 垂直时间线 */}
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
                {getTypeIcon(result.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate group flex items-center">
                  {result.name}
                  <svg
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
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

// 渲染内容
const renderContent = (
  content: any,
  type: string,
  isFullscreen: boolean,
  setIsFullscreen: (value: boolean) => void,
  error?: string,
) => {
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 text-red-500 bg-red-50/60 dark:bg-red-900/10 rounded-xl border border-red-100/40 dark:border-red-800/20"
      >
        {error}
      </motion.div>
    );
  }

  if (!content) return <div>No content available</div>;

  switch (type) {
    case 'image':
      return renderImageContent(content, isFullscreen, setIsFullscreen);
    case 'browser':
      return renderBrowserContent(content, isFullscreen, setIsFullscreen);
    case 'search':
      return renderSearchContent(content);
    case 'command':
      return renderCommandContent(content);
    case 'file':
      return renderFileContent(content);
    default:
      return renderDefaultContent(content);
  }
};

// 渲染图像内容
const renderImageContent = (
  content: any,
  isFullscreen: boolean,
  setIsFullscreen: (value: boolean) => void,
) => {
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
        <ImageControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
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
        <ImageControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
      </motion.div>
    );
  }
  return <div>Unsupported image format</div>;
};

// 图像控件组件
const ImageControls: React.FC<{
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
}> = ({ isFullscreen, setIsFullscreen }) => (
  <div className="mt-4 flex gap-2">
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      <span>Download</span>
    </motion.button>
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      onClick={() => setIsFullscreen(!isFullscreen)}
    >
      {isFullscreen ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        </svg>
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
      )}
      <span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span>
    </motion.button>
  </div>
);

// 渲染浏览器内容
const renderBrowserContent = (
  content: any,
  isFullscreen: boolean,
  setIsFullscreen: (value: boolean) => void,
) => {
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
                  <svg
                    width="12"
                    height="12"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            )}
          </div>
        </motion.div>

        <ImageControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
      </div>
    );
  }

  // 对于多模态内容（数组）
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
};

// 渲染搜索结果
const renderSearchContent = (content: any) => {
  // 处理搜索结果
  if (Array.isArray(content)) {
    // 检查这是否是多模态内容
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

    // 标准搜索结果
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
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.snippet}</div>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-500 dark:text-primary-400 hover:underline truncate block mt-1 flex items-center gap-1 group"
              >
                {item.link}
                <svg
                  width="12"
                  height="12"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
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
};

// 渲染命令输出
const renderCommandContent = (content: any) => {
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
};

// 渲染文件内容
const renderFileContent = (content: any) => {
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
};

// 其他类型工具的默认内容渲染器
const renderDefaultContent = (content: any) => {
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
};
