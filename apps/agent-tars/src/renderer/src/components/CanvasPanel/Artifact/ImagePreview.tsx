import { useState } from 'react';

interface ImagePreviewProps {
  src: string;
  alt: string;
}

export function ImagePreview({ src, alt }: ImagePreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className={`
          max-w-full rounded-lg cursor-zoom-in
          transition-transform duration-300 ease-in-out
          ${isZoomed ? 'scale-150' : 'scale-100'}
        `}
        onClick={() => setIsZoomed(!isZoomed)}
        onMouseLeave={() => setIsZoomed(false)}
      />
      {isZoomed && (
        <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded">
          Click to zoom out
        </div>
      )}
    </div>
  );
}
