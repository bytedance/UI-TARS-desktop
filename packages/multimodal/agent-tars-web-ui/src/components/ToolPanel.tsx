import React, { useEffect, useState } from 'react';
import { useSessionStore } from '../store';
import { ToolResult } from '../types';
import { FiSearch, FiMonitor, FiTerminal, FiFile, FiImage, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface ToolPanelProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({ isCollapsed }) => {
  const { activeSessionId, toolResults } = useSessionStore();
  const [selectedResult, setSelectedResult] = useState<ToolResult | null>(null);
  const activeResults = activeSessionId ? toolResults[activeSessionId] || [] : [];

  // 当会话改变时重置选中的结果
  useEffect(() => {
    setSelectedResult(null);
  }, [activeSessionId]);

  if (!activeSessionId || activeResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm p-4 text-center">
        No tool results to display yet
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

  const renderToolContent = (result: ToolResult) => {
    if (result.error) {
      return (
        <div className="p-4 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
          {result.error}
        </div>
      );
    }

    switch (result.type) {
      case 'image':
        // 处理图像内容
        if (typeof result.content === 'object' && result.content.type === 'image') {
          return (
            <img
              src={`data:image/png;base64,${result.content.data}`}
              alt={`Image from ${result.name}`}
              className="max-w-full rounded-lg shadow-sm"
            />
          );
        } else if (typeof result.content === 'string' && result.content.startsWith('data:image/')) {
          return (
            <img
              src={result.content}
              alt={`Image from ${result.name}`}
              className="max-w-full rounded-lg shadow-sm"
            />
          );
        }
        return <div>Unsupported image format</div>;

      case 'browser':
        // 处理截图或浏览器结果
        if (
          (typeof result.content === 'object' && result.content.screenshot) ||
          (typeof result.content === 'string' && result.content.startsWith('data:image/'))
        ) {
          const imgSrc =
            typeof result.content === 'object' ? result.content.screenshot : result.content;

          return (
            <div>
              <img
                src={imgSrc}
                alt="Browser screenshot"
                className="max-w-full rounded-lg shadow-sm mb-2"
              />
              {typeof result.content === 'object' && result.content.title && (
                <div className="text-sm font-medium">{result.content.title}</div>
              )}
              {typeof result.content === 'object' && result.content.url && (
                <div className="text-xs text-gray-500 truncate">
                  <a href={result.content.url} target="_blank" rel="noopener noreferrer">
                    {result.content.url}
                  </a>
                </div>
              )}
            </div>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result.content, null, 2)}
          </pre>
        );

      case 'search':
        // 处理搜索结果
        if (typeof result.content === 'object' && Array.isArray(result.content)) {
          return (
            <div className="space-y-4">
              {result.content.map((item, i) => (
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
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result.content, null, 2)}
          </pre>
        );

      case 'command':
        // 处理命令输出
        if (typeof result.content === 'string') {
          return (
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm font-mono overflow-x-auto">
              {result.content}
            </pre>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result.content, null, 2)}
          </pre>
        );

      case 'file':
        // 处理文件内容
        if (typeof result.content === 'string') {
          return (
            <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm font-mono overflow-x-auto">
              {result.content}
            </pre>
          );
        } else if (typeof result.content === 'object' && result.content.content) {
          return (
            <div>
              <div className="text-sm font-medium mb-2">
                {result.content.filename || result.content.path || 'File'}
              </div>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm font-mono overflow-x-auto">
                {result.content.content}
              </pre>
            </div>
          );
        }
        return (
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result.content, null, 2)}
          </pre>
        );

      default:
        // 默认渲染其他工具结果
        return (
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result.content, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="h-full">
      {isCollapsed ? (
        <div className="flex justify-center py-4">
          <span className="writing-vertical-lr text-xs text-gray-500 font-medium uppercase">
            Tool Results
          </span>
        </div>
      ) : selectedResult ? (
        <div className="flex-1 overflow-y-auto p-4 h-full">
          <div className="mb-4 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              {getToolIcon(selectedResult.type)}
              <span className="font-medium">{selectedResult.name}</span>
            </div>
            <button
              onClick={() => setSelectedResult(null)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
            >
              <FiX />
            </button>
          </div>
          {renderToolContent(selectedResult)}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 h-full">
          <div className="space-y-2">
            {activeResults.map((result) => (
              <motion.button
                key={result.id}
                onClick={() => setSelectedResult(result)}
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
        </div>
      )}
    </div>
  );
};
