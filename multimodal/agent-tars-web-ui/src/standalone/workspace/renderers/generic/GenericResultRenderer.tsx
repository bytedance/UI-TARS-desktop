import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCode, FiEye } from 'react-icons/fi';
import { ToolResultContentPart } from '../../types';
import { DisplayMode, AnalyzedResult } from './types';
import { analyzeResult, extractImagesFromContent, isPossibleMarkdown } from './utils';
import { BrowserShell } from '../BrowserShell';
import {
  ImageContent,
  MessageContent,
  JsonContent,
  OperationHeader,
  StatusIndicator,
  FileResultRenderer,
} from './components';
import { formatKey, formatValue } from './utils';

interface GenericResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
}

/**
 * 包装公共容器逻辑的卡片组件
 */
const ResultCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden w-full transform transition-all duration-300 hover:shadow-md">
      {children}
    </div>
  </div>
);

/**
 * GenericResultRenderer - 智能分析和渲染任何格式的工具结果
 */
export const GenericResultRenderer: React.FC<GenericResultRendererProps> = ({ part, onAction }) => {
  // 状态管理
  const [displayMode, setDisplayMode] = useState<DisplayMode>('source');

  // 首先检查是否是文件结果，如果是，直接使用专门的渲染器
  if (part.type === 'file_result') {
    return <FileResultRenderer part={part} onAction={onAction} />;
  }

  // 统一内容处理逻辑
  const content = React.useMemo(() => {
    if (Array.isArray(part.data)) {
      const textContent = part.data.find((item) => item.type === 'text');
      if (textContent?.text) return textContent.text;
    }
    return part.text || part.data || {};
  }, [part.data, part.text]);

  // 提取图像URL并分析内容类型
  const { images, hasImages, textContent } = React.useMemo(
    () =>
      typeof content === 'string'
        ? extractImagesFromContent(content)
        : { images: [], hasImages: false, textContent: content },
    [content],
  );

  // 特殊内容类型标记
  const isPureImageUrl = hasImages && images.length === 1 && textContent === '';
  const hasScreenshot = part._extra && part._extra.currentScreenshot;

  // 内容解析与分析
  const parsedContent = React.useMemo(() => {
    if (typeof content === 'string' && !isPureImageUrl) {
      try {
        return JSON.parse(content);
      } catch (e) {
        return content;
      }
    }
    return content;
  }, [content, isPureImageUrl]);

  // 结果信息分析
  const resultInfo = React.useMemo(() => {
    const result = analyzeResult(parsedContent, part.name);

    // 特殊处理：导航URL提取
    if (typeof content === 'string' && content.includes('Navigated to ')) {
      const splits = content.split('\n');
      const url = splits[0].replace('Navigated to ', '').trim();
      return {
        ...result,
        operation: 'navigate' as const,
        url,
        type: 'success' as const,
        title: 'Navigation Successful',
        details: splits.slice(1),
      };
    }

    return result;
  }, [parsedContent, part.name, content]);

  // 内容类型检测
  const isMarkdownContent = React.useMemo(() => {
    return (
      part.name?.includes('markdown') ||
      part.name?.includes('browser_get_markdown') ||
      (typeof content === 'string' && isPossibleMarkdown(content))
    );
  }, [part.name, content]);

  // UI控制标记
  const shouldOfferToggle =
    isMarkdownContent && typeof resultInfo.message === 'string' && resultInfo.message.length > 100;
  const isShortString =
    typeof resultInfo.message === 'string' && resultInfo.message.length < 80 && !isMarkdownContent;

  // 纯图像URL渲染
  if (isPureImageUrl) {
    return (
      <ResultCard>
        <ImageContent imageUrl={images[0]} name={part.name} />
      </ResultCard>
    );
  }

  // 截图渲染
  if (hasScreenshot) {
    return (
      <ResultCard>
        <BrowserShell title={resultInfo.title} url={resultInfo.url}>
          <img
            src={part._extra.currentScreenshot}
            alt="Browser Screenshot"
            className="w-full h-auto object-contain"
          />
        </BrowserShell>
      </ResultCard>
    );
  }

  // 主要内容渲染
  return (
    <ResultCard>
      <div className="p-5 relative">
        {/* 渲染嵌入的图像（如果存在） */}
        {hasImages && images.length > 0 && (
          <div className="mb-4 space-y-4">
            {images.map((imageUrl, index) => (
              <ImageContent key={index} imageUrl={imageUrl} alt={`Embedded image ${index + 1}`} />
            ))}
          </div>
        )}

        {/* markdown 内容的切换按钮 */}
        {shouldOfferToggle && (
          <div className="flex justify-end mb-3">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setDisplayMode('source')}
                className={`px-3 py-1.5 text-xs font-medium ${
                  displayMode === 'source'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                } rounded-l-lg border border-gray-200 dark:border-gray-600`}
              >
                <div className="flex items-center">
                  <FiCode className="mr-1.5" size={12} />
                  <span>Source</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('rendered')}
                className={`px-3 py-1.5 text-xs font-medium ${
                  displayMode === 'rendered'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                } rounded-r-lg border border-gray-200 dark:border-gray-600 border-l-0`}
              >
                <div className="flex items-center">
                  <FiEye className="mr-1.5" size={12} />
                  <span>Rendered</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 主要消息区域 */}
        <AnimatePresence mode="wait">
          {resultInfo.message && (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-gray-700 dark:text-gray-300 mb-4 text-[12px]"
            >
              {typeof resultInfo.message === 'string' ? (
                <MessageContent
                  message={resultInfo.message}
                  isMarkdown={isMarkdownContent}
                  displayMode={displayMode}
                  isShortMessage={isShortString && !hasScreenshot}
                />
              ) : (
                <JsonContent data={resultInfo.message} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 导航操作信息 */}
        <OperationHeader
          title={resultInfo.title}
          url={resultInfo.url}
          operationType={resultInfo.operation}
          resultType={resultInfo.type}
        />

        {/* 详情展示 */}
        {resultInfo.details && Object.keys(resultInfo.details).length > 0 && (
          <div className="grid gap-2">
            {Object.entries(resultInfo.details).map(([key, value]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start"
              >
                {!isNaN(Number(key)) ? null : (
                  <div className="text-sm font-light text-gray-500 dark:text-gray-400 w-[auto] flex-shrink-0">
                    {formatKey(key)} &nbsp;
                  </div>
                )}
                <div className="text-sm text-gray-700 dark:text-gray-300">{formatValue(value)}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 空状态处理 */}
        {!resultInfo.message &&
          !resultInfo.url &&
          (!resultInfo.details || Object.keys(resultInfo.details).length === 0) && (
            <StatusIndicator
              type={resultInfo.type}
              operation={resultInfo.operation}
              details={resultInfo.details}
            />
          )}
      </div>
    </ResultCard>
  );
};
