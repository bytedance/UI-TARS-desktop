import { ChatCompletionContentPart } from '@tarko/agent-interface';
import React from 'react';
import { motion } from 'framer-motion';
import { MarkdownRenderer } from '@tarko/ui';

interface MultimodalContentProps {
  content: ChatCompletionContentPart[];
  timestamp: number;
  setActivePanelContent: any;
}

export const MultimodalContent: React.FC<MultimodalContentProps> = ({
  content,
  timestamp,
  setActivePanelContent,
}) => {
  const imageContents = content.filter((part) => part.type === 'image_url');
  const textContents = content.filter((part) => part.type === 'text');

  const isImageOnly = imageContents.length > 0 && textContents.length === 0;

  return (
    <>
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
              <img
                src={part.image_url.url}
                alt={'Image'}
                className={`${isImageOnly ? 'max-h-48' : 'h-24'} rounded-3xl object-cover`}
              />
            </motion.div>
          ))}
        </div>
      )}

      {textContents.map((part, index) => (
        <div key={`text-${index}`} className="text-current" style={{ whiteSpace: 'break-spaces' }}>
          {part.text}
        </div>
      ))}
    </>
  );
};
