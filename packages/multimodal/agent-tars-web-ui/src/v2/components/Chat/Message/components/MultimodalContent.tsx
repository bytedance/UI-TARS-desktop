import React from 'react';
import { motion } from 'framer-motion';
import { FiMaximize } from 'react-icons/fi';
import { Markdown } from '../../../Common/Markdown';

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
  return content.map((part, index) => {
    if (part.type === 'text') {
      return <Markdown key={index}>{part.text}</Markdown>;
    }

    if (part.type === 'image_url') {
      return (
        <motion.div
          key={index}
          whileHover={{ scale: 1.02 }}
          onClick={() =>
            setActivePanelContent({
              type: 'image',
              source: part.image_url.url,
              title: part.image_url.alt || 'Image',
              timestamp,
            })
          }
          className="relative group cursor-pointer inline-block mt-2 mb-2"
        >
          {/* Render the actual image thumbnail */}
          <img 
            src={part.image_url.url} 
            alt={part.image_url.alt || 'Image'} 
            className="h-24 rounded-lg object-cover shadow-sm" 
          />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200 flex items-center justify-center">
            <FiMaximize className="text-white" size={20} />
          </div>
        </motion.div>
      );
    }

    return null;
  });
};
