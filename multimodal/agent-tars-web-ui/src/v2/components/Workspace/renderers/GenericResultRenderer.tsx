import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';
import {
  FiCheck,
  FiX,
  FiAlertCircle,
  FiInfo,
  FiRefreshCw,
  FiGlobe,
  FiNavigation,
  FiMousePointer,
  FiLink,
  FiArrowRight,
  FiCornerUpRight,
  FiLayers,
} from 'react-icons/fi';
import { ToolResultContentPart } from '../../../types';

interface GenericResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * GenericResultRenderer - 智能分析并渲染任意格式的工具结果
 *
 * 特点:
 * - 自动识别常见的状态模式（成功/失败/信息）
 * - 提取并突出显示关键信息
 * - 优雅处理各种数据结构
 * - 美观一致的卡片式布局
 * - 丝滑的动画过渡效果
 * - 针对不同操作类型的特殊可视化处理
 */
export const GenericResultRenderer: React.FC<GenericResultRendererProps> = ({ part }) => {
  const content = part.text || part.data || {};
  const [showDetails, setShowDetails] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);

  // 尝试将字符串内容解析为JSON
  let parsedContent = content;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // 不是有效的JSON，保持字符串格式
      parsedContent = content;
    }
  }

  // 智能检测结果类型
  const resultInfo = analyzeResult(parsedContent, part.name);

  console.log('resultInfo', resultInfo);

  // 触发成功动画
  useEffect(() => {
    if (resultInfo.type === 'success') {
      setAnimateSuccess(true);
      const timer = setTimeout(() => setAnimateSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [resultInfo.type]);

  // 添加对导航类操作的特殊处理
  const isNavigationOperation =
    part.name?.includes('navigate') || (typeof parsedContent === 'object' && parsedContent?.url);

  console.log('isNavigationOperation', isNavigationOperation);

  // 检测内容是否为 Markdown
  const isPossibleMarkdown = (text: string): boolean => {
    // 检查常见的 Markdown 语法特征
    const markdownPatterns = [
      /^#+\s+.+$/m, // 标题
      /\[.+\]\(.+\)/, // 链接
      /\*\*.+\*\*/, // 粗体
      /\*.+\*/, // 斜体
      /```[\s\S]*```/, // 代码块
      /^\s*-\s+.+$/m, // 无序列表
      /^\s*\d+\.\s+.+$/m, // 有序列表
      />\s+.+/, // 引用块
      /!\[.+\]\(.+\)/, // 图片
      /^---$/m, // 分隔线
      /^\|.+\|$/m, // 表格
    ];

    // 如果满足至少两个 Markdown 特征，或者内容较长并包含一个特征，认为是 Markdown
    const matchCount = markdownPatterns.filter((pattern) => pattern.test(text)).length;
    return matchCount >= 2 || (text.length > 500 && matchCount >= 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/30 shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
        {/* 状态头部 */}
        <div
          className={`py-4 px-5 flex items-center justify-between border-b ${getHeaderClasses(resultInfo.type)}`}
        >
          <div className="flex items-center">
            <div className="mr-3 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={resultInfo.type}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  {getStatusIcon(resultInfo.type, resultInfo.operation)}
                </motion.div>
              </AnimatePresence>

              {/* 成功动画效果 */}
              {animateSuccess && resultInfo.type === 'success' && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full bg-green-500 dark:bg-green-400 z-0"
                />
              )}
            </div>
            <div>
              <motion.span
                className="font-medium"
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
              >
                {part.name || resultInfo.title}
              </motion.span>
              {resultInfo.operation && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {getOperationDescription(resultInfo.operation, resultInfo)}
                </div>
              )}
            </div>
          </div>

          {/* 添加URL显示（适用于浏览器工具） */}
          {resultInfo.url && (
            <div className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors group">
              <FiLink size={12} className="mr-1 group-hover:text-accent-500" />
              <a
                href={resultInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[200px] truncate hover:underline transition-all"
              >
                {resultInfo.url}
              </a>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="p-5 relative">
          {/* 主要消息区 */}
          <AnimatePresence mode="wait">
            {resultInfo.message ? (
              <motion.div
                key="message"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-gray-700 dark:text-gray-300 mb-4"
              >
                {typeof resultInfo.message === 'string' &&
                isPossibleMarkdown(resultInfo.message) ? (
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <MarkdownRenderer content={`\`\`\`md\n${resultInfo.message}\n\`\`\``} />
                  </div>
                ) : (
                  resultInfo.message
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* 针对导航类操作的特殊处理 */}
          {isNavigationOperation && resultInfo.type === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-4"
            >
              <div className="flex items-center mt-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FiCornerUpRight className="text-accent-500 dark:text-accent-400" size={16} />
                </div>
                <div className="ml-3">
                  <div className="text-sm text-gray-500 dark:text-gray-400">导航至</div>
                  <div className="font-medium text-accent-600 dark:text-accent-400 flex items-center">
                    {resultInfo.url}
                  </div>
                </div>
              </div>

              {/* 导航动画 */}
              <div className="my-5 px-3">
                <div className="relative h-0.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0, x: 0 }}
                    animate={{ width: '100%', x: ['0%', '100%'] }}
                    transition={{
                      duration: 1.5,
                      width: { duration: 0 },
                      x: { duration: 1.5, ease: 'easeInOut' },
                    }}
                    className="absolute top-0 left-0 h-full bg-accent-500 dark:bg-accent-400 rounded-full"
                    style={{ width: '30%' }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* 详细信息切换按钮 - 只在有额外信息时显示 */}
          {resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="mt-2 mb-3"
            >
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs flex items-center text-gray-500 dark:text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
              >
                <motion.div
                  animate={{ rotate: showDetails ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiArrowRight size={12} className="mr-1.5" />
                </motion.div>
                {showDetails ? '隐藏详情' : '查看详情'}
              </button>
            </motion.div>
          )}

          {/* 详细信息区 - 只在有额外信息时显示 */}
          <AnimatePresence>
            {showDetails && resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/30">
                  <div className="grid gap-2">
                    {Object.entries(resultInfo.details).map(([key, value]) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start"
                      >
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 flex-shrink-0">
                          {formatKey(key)}:
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {formatValue(value)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 空状态处理 - 美化版 */}
          {!resultInfo.message &&
            !resultInfo.url &&
            (!resultInfo.details || Object.keys(resultInfo.details).length === 0) && (
              <div className="flex flex-col items-center justify-center py-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2,
                    type: 'spring',
                    stiffness: 100,
                  }}
                  className="flex flex-col items-center"
                >
                  {resultInfo.type === 'success' ? (
                    <>
                      <div className="w-12 h-12 mb-3 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 dark:text-green-400">
                        <motion.div
                          animate={{
                            scale: [1, 1.15, 1],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            repeatDelay: 1,
                          }}
                        >
                          <FiCheck size={24} />
                        </motion.div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                          The operation completed successfully
                        </div>
                        {resultInfo.operation && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getOperationDescription(resultInfo.operation, resultInfo)}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                        <FiInfo size={24} />
                      </div>
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        {resultInfo.type === 'empty' ? '无可用内容' : '操作已完成'}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 分析工具结果并提取关键信息
 */
function analyzeResult(
  content: any,
  toolName?: string,
): {
  type: 'success' | 'error' | 'info' | 'empty';
  title: string;
  message: string | null;
  details: Record<string, any>;
  url?: string;
  operation?: string; // 添加操作类型
} {
  // 默认值
  const result = {
    type: 'info' as const,
    title: 'Operation Result',
    message: null,
    details: {} as Record<string, any>,
  };

  // 尝试从工具名称中推断操作类型
  let operation = '';
  if (toolName) {
    if (toolName.includes('navigate')) operation = 'navigate';
    else if (toolName.includes('click')) operation = 'click';
    else if (toolName.includes('type')) operation = 'type';
    else if (toolName.includes('scroll')) operation = 'scroll';
    else if (toolName.includes('browser')) operation = 'browser';
  }

  // 处理空内容
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return { ...result, type: 'empty', title: 'Empty Result', operation };
  }

  // 处理字符串内容
  if (typeof content === 'string') {
    // 检测是否是导航成功消息
    if (content.includes('Navigated to ')) {
      const url = content.replace('Navigated to ', '').trim();
      return {
        ...result,
        type: 'success',
        title: 'Navigation Successful',
        message: null,
        details: { url },
        url,
        operation: 'navigate',
      };
    }
    return { ...result, message: content, operation };
  }

  // 处理对象内容
  if (typeof content === 'object') {
    // 特别处理导航相关
    if (content.url) {
      operation = operation || 'navigate';
      result.url = content.url;
    }

    // 检测状态字段
    if ('status' in content) {
      const status = String(content.status).toLowerCase();
      if (status === 'success' || status === 'ok' || status === 'completed') {
        result.type = 'success';
        result.title = 'Success';
      } else if (status === 'error' || status === 'fail' || status === 'failed') {
        result.type = 'error';
        result.title = 'Error';
      }
    }

    // 检测消息字段
    if ('message' in content) {
      result.message = String(content.message);
    } else if ('error' in content) {
      result.message = String(content.error);
      result.type = 'error';
      result.title = 'Error';
    } else if ('msg' in content) {
      result.message = String(content.msg);
    } else if ('content' in content && typeof content.content === 'string') {
      result.message = content.content;
    }

    // 提取标题
    if ('title' in content && typeof content.title === 'string' && content.title.trim()) {
      result.title = content.title;
    } else if (result.message && result.message.length < 50) {
      // 如果消息很短，可以用作标题
      result.title = result.message;
      result.message = null;
    }

    // 特别处理URL (用于浏览器工具结果)
    let url: string | undefined = undefined;
    if ('url' in content && typeof content.url === 'string') {
      url = content.url;
    }

    // 收集其他重要字段作为详情
    for (const [key, value] of Object.entries(content)) {
      // 跳过已处理的字段
      if (['status', 'message', 'error', 'msg', 'title', 'url'].includes(key)) continue;

      // 特殊处理分页信息
      if (key === 'pagination' && typeof value === 'object') {
        for (const [pKey, pValue] of Object.entries(value)) {
          result.details[`pagination.${pKey}`] = pValue;
        }
        continue;
      }

      // 优先展示这些重要字段
      const importantFields = ['name', 'description', 'type', 'value', 'data'];
      if (importantFields.includes(key)) {
        result.details = { [key]: value, ...result.details };
      } else {
        // 添加到详情中
        result.details[key] = value;
      }
    }

    return { ...result, url, operation };
  }

  return { ...result, operation };
}

/**
 * 获取状态图标
 */
function getStatusIcon(type: string, operation?: string) {
  // 先根据操作类型选择图标
  if (operation) {
    switch (operation) {
      case 'navigate':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-accent-50 dark:bg-accent-900/20 text-accent-500 dark:text-accent-400">
            <FiNavigation size={16} />
          </div>
        );
      case 'click':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400">
            <FiMousePointer size={16} />
          </div>
        );
      case 'browser':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
            <FiGlobe size={16} />
          </div>
        );
    }
  }

  // 回退到基于状态类型的图标
  switch (type) {
    case 'success':
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400">
          <FiCheck size={16} />
        </div>
      );
    case 'error':
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400">
          <FiX size={16} />
        </div>
      );
    case 'empty':
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
          <FiLayers size={16} />
        </div>
      );
    case 'info':
    default:
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
          <FiInfo size={16} />
        </div>
      );
  }
}

/**
 * 根据操作类型生成描述
 */
function getOperationDescription(operation: string, resultInfo: any): string {
  switch (operation) {
    case 'navigate':
      return resultInfo.url ? `导航至 ${resultInfo.url}` : '页面导航';
    case 'click':
      return '点击元素';
    case 'type':
      return '输入文本';
    case 'scroll':
      return '滚动页面';
    case 'browser':
      return '浏览器操作';
    default:
      return '操作已完成';
  }
}

/**
 * 获取头部样式类
 */
function getHeaderClasses(type: string): string {
  switch (type) {
    case 'success':
      return 'border-green-100/50 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/20';
    case 'error':
      return 'border-red-100/50 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/20';
    case 'empty':
      return 'border-gray-100/50 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-800/50';
    case 'info':
    default:
      return 'border-blue-100/50 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/20';
  }
}

/**
 * 格式化键名
 */
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // 在大写字母前插入空格
    .replace(/^./, (str) => str.toUpperCase()) // 首字母大写
    .replace(/[._]/g, ' '); // 将下划线和点替换为空格
}

/**
 * 格式化值显示
 */
function formatValue(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500 italic">None</span>;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 dark:text-gray-500 italic">Empty array</span>;
    }

    if (
      value.length <= 3 &&
      value.every((item) => typeof item === 'string' || typeof item === 'number')
    ) {
      return value.join(', ');
    }

    return (
      <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === 'object') {
    try {
      return (
        <pre className="text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    } catch (e) {
      return String(value);
    }
  }

  // 检测URL并使其可点击
  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-600 dark:text-accent-400 hover:underline"
      >
        {value}
      </a>
    );
  }

  return String(value);
}
