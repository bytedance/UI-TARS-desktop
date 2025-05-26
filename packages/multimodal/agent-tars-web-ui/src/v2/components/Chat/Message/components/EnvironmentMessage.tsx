import React from 'react';
import { motion } from 'framer-motion';
import { FiMaximize } from 'react-icons/fi';
import { Markdown } from '../../../Common/Markdown';

interface EnvironmentMessageProps {
  content: any;
  description?: string;
  timestamp: number;
  setActivePanelContent: (content: any) => void;
}

/**
 * Component for displaying environment messages with optimized image rendering
 * 
 * Design principles:
 * - Efficient rendering of multi-format content
 * - Interactive image thumbnails with preview capability
 * - Clear visual hierarchy with descriptive labels
 */
export const EnvironmentMessage: React.FC<EnvironmentMessageProps> = ({
  content,
  description,
  timestamp,
  setActivePanelContent,
}) => {
  // Handle direct rendering of images from environment input
  if (Array.isArray(content)) {
    const images = content.filter((part) => part.type === 'image_url');
    const textParts = content.filter((part) => part.type === 'text');
    
    return (
      <div className="space-y-2">
        {/* Render text content if any */}
        {textParts.length > 0 && (
          <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
            {textParts.map((part, idx) => (
              <Markdown key={idx}>{part.text}</Markdown>
            ))}
          </div>
        )}
        
        {/* Render images as thumbnails */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {images.map((image, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.03 }}
                className="relative group cursor-pointer"
                onClick={() => setActivePanelContent({
                  type: 'image',
                  source: image.image_url.url,
                  title: description || 'Environment Input',
                  timestamp,
                })}
              >
                {/* Thumbnail image with no border */}
                <img 
                  src={image.image_url.url} 
                  alt={image.image_url.alt || 'Screenshot'} 
                  className="h-24 rounded-lg object-cover shadow-sm" 
                />
                
                {/* Hover overlay with expand icon */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                  <FiMaximize className="text-white" size={20} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // Fallback for non-array content
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none text-sm">
      {description && (
        <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">{description}</div>
      )}
      {typeof content === 'string' ? <Markdown>{content}</Markdown> : <pre>{JSON.stringify(content, null, 2)}</pre>}
    </div>
  );
};
