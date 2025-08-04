import React from 'react';
import { motion } from 'framer-motion';

interface ImageProps {
  src?: string;
  alt?: string;
  onClick?: (src: string) => void;
}

/**
 * Interactive image component with hover effects
 */
export const InteractiveImage: React.FC<ImageProps> = ({
  src,
  alt = 'Documentation image',
  onClick,
}) => {
  const handleClick = () => {
    if (src && onClick) {
      onClick(src);
    }
  };

  return (
    <motion.img
      className="max-w-full h-auto my-6 rounded-lg cursor-pointer"
      src={src}
      alt={alt}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    />
  );
};
