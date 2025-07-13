import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolResultContentPart } from '../../types';
import { DisplayMode } from './types';
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
import { FileDisplayMode } from '../../types';

interface GenericResultRendererProps {
  part: ToolResultContentPart;
  onAction?: (action: string, data: any) => void;
  displayMode?: FileDisplayMode;
}

const ResultCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full">
    <div className="rounded-xl overflow-hidden w-full transform transition-all duration-300">
      {children}
    </div>
  </div>
);

export const GenericResultRenderer: React.FC<GenericResultRendererProps> = ({
  part,
  onAction,
  displayMode,
}) => {
  if (part.type === 'file_result') {
    return <FileResultRenderer part={part} onAction={onAction} displayMode={displayMode} />;
  }

  const content = React.useMemo(() => {
    if (Array.isArray(part.data)) {
      const textContent = part.data.find((item) => item.type === 'text');
      if (textContent?.text) return textContent.text;
    }
    return part.text || part.data || {};
  }, [part.data, part.text]);

  const { images, hasImages, textContent } = React.useMemo(
    () =>
      typeof content === 'string'
        ? extractImagesFromContent(content)
        : { images: [], hasImages: false, textContent: content },
    [content],
  );

  const isPureImageUrl = hasImages && images.length === 1 && textContent === '';
  const hasScreenshot = part._extra && part._extra.currentScreenshot;

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

  const resultInfo = React.useMemo(() => {
    const result = analyzeResult(parsedContent, part.name);

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

  const isMarkdownContent = React.useMemo(() => {
    return (
      part.name?.includes('markdown') ||
      part.name?.includes('browser_get_markdown') ||
      (typeof content === 'string' && isPossibleMarkdown(content))
    );
  }, [part.name, content]);

  const isShortString =
    typeof resultInfo.message === 'string' && resultInfo.message.length < 80 && !isMarkdownContent;

  if (isPureImageUrl) {
    return (
      <ResultCard>
        <ImageContent imageUrl={images[0]} name={part.name} />
      </ResultCard>
    );
  }

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

  return (
    <ResultCard>
      <div className="p-5 relative">
        {hasImages && images.length > 0 && (
          <div className="mb-4 space-y-4">
            {images.map((imageUrl, index) => (
              <ImageContent key={index} imageUrl={imageUrl} alt={`Embedded image ${index + 1}`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {resultInfo.message && (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-gray-700 dark:text-gray-300 text-[12px]"
            >
              {typeof resultInfo.message === 'string' ? (
                <MessageContent
                  message={resultInfo.message}
                  isMarkdown={isMarkdownContent}
                  displayMode={displayMode as DisplayMode}
                  isShortMessage={isShortString && !hasScreenshot}
                />
              ) : (
                <JsonContent data={resultInfo.message} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <OperationHeader
          title={resultInfo.title}
          url={resultInfo.url}
          operationType={resultInfo.operation}
          resultType={resultInfo.type}
        />

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
