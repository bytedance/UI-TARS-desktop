import { ChatCompletionContentPart } from '@tarko/agent-interface';
import React from 'react';
import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@/sdk/markdown-renderer';

interface MultimodalContentProps {
  content: ChatCompletionContentPart[];
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
  // Filter out image and text content
  const imageContents = content.filter((part) => part.type === 'image_url');
  const textContents = content.filter((part) => part.type === 'text');

  // Image-only case - optimize layout
  const isImageOnly = imageContents.length > 0 && textContents.length === 0;

  return (
    <>
      {/* Render image content */}
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
                  title: 'Image',
                  timestamp,
                })
              }
              className="relative group cursor-pointer inline-block"
            >
              {/* Render the actual image thumbnail */}
              <img
                src={part.image_url.url}
                alt={'Image'}
                className={`${isImageOnly ? 'max-h-48' : 'h-24'} rounded-3xl object-cover`}
              />

              {/* Hover overlay */}
              {/* <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                <FiMaximize className="text-white" size={20} />
              </div> */}
            </motion.div>
          ))}
        </div>
      )}

      {/* Render text content - ensure text is visible in user messages */}
      {textContents.map((part, index) => (
        <div key={`text-${index}`} className="text-current" style={{ whiteSpace: 'break-spaces' }}>
          {part.text}
        </div>
      ))}
    </>
  );
};
