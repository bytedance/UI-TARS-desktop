import React from 'react';
import { motion } from 'framer-motion';
import { FiMaximize } from 'react-icons/fi';
import { MarkdownRenderer } from '../../../Markdown';
import { BrowserShell } from '../../../Workspace/renderers/BrowserShell';
import { useSession } from '../../../../hooks/useSession';

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
 * - Uses BrowserShell for browser screenshots for consistent UI with browser_vision_control
 */
export const EnvironmentMessage: React.FC<EnvironmentMessageProps> = ({
  content,
  description,
  timestamp,
  setActivePanelContent,
  isIntermediate = false,
}) => {
  const { replayState } = useSession();
  
  // 处理直接从环境输入渲染图像
  if (Array.isArray(content)) {
    const images = content.filter((part) => part.type === 'image_url');
    const textParts = content.filter((part) => part.type === 'text');

    // 空内容处理
    if (images.length === 0 && textParts.length === 0) {
      return <div className="text-xs text-gray-500 italic">环境输入</div>;
    }

    // 检查是否是浏览器截图 - 通过description判断或使用启发式方法
    const isBrowserScreenshot = 
      description?.toLowerCase().includes('browser') || 
      description?.toLowerCase().includes('screenshot') ||
      // 如果描述包含特定关键词但图片数量较少，可能是浏览器截图
      (images.length === 1 && !isIntermediate);

    // 确保在回放模式下图片能够正确加载
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      console.warn('Image failed to load:', e.currentTarget.src);
      // 可以在这里添加重试逻辑或替代图片
    };

    // 对于浏览器截图，使用BrowserShell进行渲染
    if (isBrowserScreenshot && images.length > 0) {
      return (
        <div className="space-y-1">
          {/* 渲染文本内容 */}
          {textParts.length > 0 && (
            <div
              className={`prose dark:prose-invert prose-sm max-w-none ${isIntermediate ? 'text-xs' : 'text-sm'} mb-2`}
            >
              {textParts.map((part, idx) => (
                <MarkdownRenderer key={idx} content={part.text} />
              ))}
            </div>
          )}

          {/* 使用BrowserShell渲染浏览器截图 */}
          <BrowserShell title={description || 'Browser Screenshot'}>
            <div className="relative group cursor-pointer" onClick={() => 
              setActivePanelContent({
                type: 'image',
                source: images[0].image_url.url,
                title: description || '浏览器截图',
                timestamp,
              })
            }>
              <img
                src={images[0].image_url.url}
                alt={images[0].image_url.alt || '截图'}
                className="w-full h-auto object-contain"
                onError={handleImageError}
              />
              
              {/* 悬停覆盖层 */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <FiMaximize className="text-white" size={20} />
              </div>
            </div>
          </BrowserShell>
        </div>
      );
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
                  onError={handleImageError}
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
