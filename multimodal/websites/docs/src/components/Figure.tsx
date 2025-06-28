import React, { ReactNode } from 'react';

interface FigureProps {
  src: string;
  alt?: string;
  title?: string | ReactNode;
  zoom?: number;
  maxWidth?: string | number;
  className?: string;
}

export function Figure({
  src,
  alt,
  title,
  zoom = 1,
  maxWidth = '100%',
  className = '',
}: FigureProps) {
  // 将 maxWidth 转换为 CSS 值
  const maxWidthStyle = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;

  return (
    <figure className={`mx-auto my-10 ${className}`} style={{ maxWidth: maxWidthStyle }}>
      <div className="w-full">
        <img
          src={src}
          alt={alt || ''}
          className="w-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </div>

      {title && (
        <figcaption className="text-center text-[10px] text-gray-500 mt-2">{title}</figcaption>
      )}
    </figure>
  );
}
