import React, { memo } from 'react';
import { StandaloneMarkdownText } from './StandaloneMarkdownText';
import '@assistant-ui/react-markdown/styles/dot.css';

interface MarkdownTextProps {
  content: string;
  onImageClick?: (src: string) => void;
  codeBlockStyle?: React.CSSProperties;
  className?: string;
  smooth?: boolean;
}

const MarkdownTextImpl: React.FC<MarkdownTextProps> = ({
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

export const MarkdownText = memo(MarkdownTextImpl);