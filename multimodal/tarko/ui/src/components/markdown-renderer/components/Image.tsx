import React from 'react';

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
    <img
      className="max-w-full h-auto my-6 rounded-lg cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
      src={src}
      alt={alt}
      onClick={handleClick}
    />
  );
};
