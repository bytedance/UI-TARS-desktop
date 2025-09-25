import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { useMarkdownComponents } from '../components';

// Standalone version that doesn't require @assistant-ui/react context
// Uses react-markdown directly but with assistant-ui styling

interface StandaloneMarkdownTextProps {
  content: string;
  onImageClick?: (src: string) => void;
  codeBlockStyle?: React.CSSProperties;
  className?: string;
  smooth?: boolean; // Note: smooth is not implemented in this standalone version
}

const StandaloneMarkdownTextImpl: React.FC<StandaloneMarkdownTextProps> = ({
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
    <div className={`aui-md ${className}`}>
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

export const StandaloneMarkdownText = memo(StandaloneMarkdownTextImpl);