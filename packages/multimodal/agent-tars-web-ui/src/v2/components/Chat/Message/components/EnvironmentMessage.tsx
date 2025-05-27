import React from 'react';
import { motion } from 'framer-motion';
import { FiMaximize } from 'react-icons/fi';
import { MarkdownRenderer } from '../../../Markdown';

interface EnvironmentMessageProps {
  content: any;
  description?: string;
  timestamp: number;
  setActivePanelContent: (content: any) => void;
  isIntermediate?: boolean;
}

/**
 * Component for displaying environment messages with optimized image rendering
 *
 * Design principles:
 * - Efficient rendering of multi-format content
 * - Interactive image thumbnails with preview capability
 * - Clear visual hierarchy with descriptive labels
 * - Compact and elegant styling for images without borders
 * - Support for intermediate display in thinking sequences
 */
export const EnvironmentMessage: React.FC<EnvironmentMessageProps> = ({
  content,
  description,
  timestamp,
  setActivePanelContent,
  isIntermediate = false,
}) => {
  // 处理直接从环境输入渲染图像
  if (Array.isArray(content)) {
    const images = content.filter((part) => part.type === 'image_url');
    const textParts = content.filter((part) => part.type === 'text');

    // 空内容处理
    if (images.length === 0 && textParts.length === 0) {
      return <div className="text-xs text-gray-500 italic">环境输入</div>;
    }

    return (
      <div className="space-y-1">
        {/* 渲染文本内容 */}
        {textParts.length > 0 && (
          <div
            className={`prose dark:prose-invert prose-sm max-w-none ${isIntermediate ? 'text-xs' : 'text-sm'}`}
          >
            {textParts.map((part, idx) => (
              <MarkdownRenderer key={idx} content={part.text} />
            ))}
          </div>
        )}

        {/* 将图像渲染为无边框的缩略图 */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {images.map((image, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02 }}
                className="relative group cursor-pointer"
                onClick={() =>
                  setActivePanelContent({
                    type: 'image',
                    source: image.image_url.url,
                    title: description || '环境输入',
                    timestamp,
                  })
                }
              >
                {/* 缩略图 */}
                <img
                  src={image.image_url.url}
                  alt={image.image_url.alt || '截图'}
                  className={`${isIntermediate ? 'h-16' : 'h-20'} rounded-lg object-cover shadow-sm`}
                />

                {/* 悬停覆盖层 */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                  <FiMaximize className="text-white" size={isIntermediate ? 14 : 16} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 非数组内容的回退
  return (
    <div
      className={`prose dark:prose-invert prose-sm max-w-none ${isIntermediate ? 'text-xs' : 'text-sm'}`}
    >
      {description && !isIntermediate && (
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          {description}
        </div>
      )}
      {typeof content === 'string' ? (
        <MarkdownRenderer content={content} />
      ) : (
        <pre className="text-xs">{JSON.stringify(content, null, 2)}</pre>
      )}
    </div>
  );
};