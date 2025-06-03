import React from 'react';
import { motion } from 'framer-motion';
import { FiMaximize } from 'react-icons/fi';
import { MarkdownRenderer } from '../../../Markdown';

interface MultimodalContentProps {
  content: any[];
  timestamp: number;
  setActivePanelContent: any;
}

/**
 * Component for rendering multimodal content (text and images)
 *
 * Design principles:
 * - Seamless integration of different content types
 * - Interactive image previews with expansion capability
 * - Consistent formatting of text and visual elements
 */
export const MultimodalContent: React.FC<MultimodalContentProps> = ({
  content,
  timestamp,
  setActivePanelContent,
}) => {
  // 筛选出图片和文本内容
  const imageContents = content.filter((part) => part.type === 'image_url');
  const textContents = content.filter((part) => part.type === 'text');

  // 仅包含图片的情况 - 优化布局
  const isImageOnly = imageContents.length > 0 && textContents.length === 0;

  return (
    <>
      {/* 渲染图片内容 */}
      {imageContents.length > 0 && (
        <div
          className={`${isImageOnly ? '' : 'mt-2 mb-2'} ${imageContents.length > 1 ? 'flex flex-wrap gap-2' : ''}`}
        >
          {imageContents.map((part, index) => (
            <motion.div
              key={`image-${index}`}
              whileHover={{ scale: 1.02 }}
              onClick={() =>
                setActivePanelContent({
                  type: 'image',
                  source: part.image_url.url,
                  title: part.image_url.alt || 'Image',
                  timestamp,
                })
              }
              className="relative group cursor-pointer inline-block"
            >
              {/* Render the actual image thumbnail */}
              <img
                src={part.image_url.url}
                alt={part.image_url.alt || 'Image'}
                className={`${isImageOnly ? 'max-h-48' : 'h-24'} rounded-3xl object-cover border`}
              />

              {/* Hover overlay */}
              {/* <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                <FiMaximize className="text-white" size={20} />
              </div> */}
            </motion.div>
          ))}
        </div>
      )}

      {/* 渲染文本内容 */}
      {textContents.map((part, index) => (
        <MarkdownRenderer key={`text-${index}`} content={part.text} />
      ))}
    </>
  );
};
