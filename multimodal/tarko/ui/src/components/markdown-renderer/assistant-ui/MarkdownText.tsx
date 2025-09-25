import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { useMarkdownComponents } from '../components';

// Fallback to regular react-markdown for now
// TODO: Implement proper assistant-ui integration when the API is more stable

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
  smooth = true, // Note: smooth is not yet implemented in this fallback
}) => {
  const components = useMarkdownComponents({
    onImageClick: onImageClick || (() => {}),
    codeBlockStyle,
  });

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);