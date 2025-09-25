import React, { memo } from 'react';
import { StandaloneMarkdownText } from '../assistant-ui/StandaloneMarkdownText';
import '@assistant-ui/react-markdown/styles/dot.css';

interface SmoothMarkdownRendererProps {
  content: string;
  onImageClick?: (src: string) => void;
  codeBlockStyle?: React.CSSProperties;
  className?: string;
  smooth?: boolean;
}

const SmoothMarkdownRendererImpl: React.FC<SmoothMarkdownRendererProps> = ({
  content,
  onImageClick,
  codeBlockStyle,
  className = '',
  smooth = true,
}) => {
  return (
    <div className={className}>
      <StandaloneMarkdownText
        content={content}
        onImageClick={onImageClick}
        codeBlockStyle={codeBlockStyle}
        smooth={smooth}
      />
    </div>
  );
};

export const SmoothMarkdownRenderer = memo(SmoothMarkdownRendererImpl);