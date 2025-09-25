import React, { useState, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import { useMarkdownComponents } from '../components';

interface SmoothMarkdownRendererProps {
  content: string;
  onImageClick?: (src: string) => void;
  codeBlockStyle?: React.CSSProperties;
  className?: string;
  smooth?: boolean;
  streamingSpeed?: number;
}

const SmoothMarkdownRendererImpl: React.FC<SmoothMarkdownRendererProps> = ({
  content,
  onImageClick,
  codeBlockStyle,
  className = '',
  smooth = true,
  streamingSpeed = 5,
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const components = useMarkdownComponents({
    onImageClick: onImageClick || (() => {}),
    codeBlockStyle,
  });

  // Smooth streaming effect
  useEffect(() => {
    if (!smooth || content === displayedContent) {
      setDisplayedContent(content);
      return;
    }

    setIsStreaming(true);
    let currentIndex = displayedContent.length;
    
    const streamInterval = setInterval(() => {
      if (currentIndex >= content.length) {
        clearInterval(streamInterval);
        setIsStreaming(false);
        return;
      }

      const nextIndex = Math.min(currentIndex + streamingSpeed, content.length);
      setDisplayedContent(content.slice(0, nextIndex));
      currentIndex = nextIndex;
    }, 16); // ~60fps

    return () => {
      clearInterval(streamInterval);
      setIsStreaming(false);
    };
  }, [content, smooth, streamingSpeed, displayedContent.length]);

  const containerClassName = `${className} ${isStreaming ? 'markdown-streaming' : ''}`;

  return (
    <div className={containerClassName}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {displayedContent}
      </ReactMarkdown>
      {isStreaming && (
        <span className="markdown-streaming-cursor" aria-hidden="true">
          ▊
        </span>
      )}
    </div>
  );
};

export const SmoothMarkdownRenderer = memo(SmoothMarkdownRendererImpl);