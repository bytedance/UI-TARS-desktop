import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeHighlight from 'rehype-highlight';
import { useMarkdownComponents } from './hooks/useMarkdownComponents';
import { ImageModal } from './components/ImageModal';
import { resetFirstH1Flag } from './components/Headings';
import { scrollToElement, preprocessMarkdownLinks } from './utils';
import { MarkdownThemeProvider, useMarkdownStyles } from './context/MarkdownThemeContext';
import 'katex/dist/katex.min.css';
import 'remark-github-blockquote-alert/alert.css';
import './syntax-highlight.css';
import './markdown.css';

interface StreamingMarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
}

/**
 * StreamingMarkdownRenderer component
 * Renders markdown content with smooth streaming animation
 */
export const StreamingMarkdownRenderer: React.FC<StreamingMarkdownRendererProps> = (props) => {
  return (
    <MarkdownThemeProvider>
      <StreamingMarkdownRendererContent {...props} />
    </MarkdownThemeProvider>
  );
};

/**
 * Internal component that uses the theme context
 */
const StreamingMarkdownRendererContent: React.FC<StreamingMarkdownRendererProps> = ({
  content,
  publishDate,
  author,
  className = '',
  forceDarkTheme = false,
}) => {
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [stableContent, setStableContent] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const { themeClass, colors } = useMarkdownStyles();
  const prevContentRef = useRef('');
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Split content into stable and streaming parts
   */
  useEffect(() => {
    const currentContent = content.trim();
    const previousContent = prevContentRef.current.trim();

    // If content is completely new or shorter, render all as stable
    if (!currentContent.startsWith(previousContent) || currentContent.length < previousContent.length) {
      setStableContent(currentContent);
      setStreamingContent('');
      prevContentRef.current = currentContent;
      return;
    }

    // If content is growing, split into stable and streaming parts
    if (currentContent.length > previousContent.length) {
      // Find the last complete markdown block in previous content
      const lines = previousContent.split('\n');
      let stableEndIndex = 0;
      
      // Look for complete markdown blocks (paragraphs, headers, code blocks, etc.)
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        // If we find a line that looks like a complete block
        if (line === '' || line.match(/^#{1,6}\s/) || line.match(/^```/) || line.endsWith('.') || line.endsWith('!') || line.endsWith('?')) {
          stableEndIndex = lines.slice(0, i + 1).join('\n').length;
          break;
        }
      }

      // If we found a good split point, use it
      if (stableEndIndex > 0 && stableEndIndex < currentContent.length) {
        setStableContent(currentContent.substring(0, stableEndIndex));
        setStreamingContent(currentContent.substring(stableEndIndex));
      } else {
        // Otherwise, keep most content stable and only stream the very end
        const splitPoint = Math.max(0, previousContent.length - 100);
        setStableContent(currentContent.substring(0, splitPoint));
        setStreamingContent(currentContent.substring(splitPoint));
      }

      // After a delay, move streaming content to stable
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      
      streamingTimeoutRef.current = setTimeout(() => {
        setStableContent(currentContent);
        setStreamingContent('');
      }, 1000);
    }

    prevContentRef.current = currentContent;

    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, [content]);

  /**
   * Handle image click for modal preview
   */
  const handleImageClick = (src: string) => {
    setOpenImage(src);
  };

  /**
   * Close image modal
   */
  const handleCloseModal = () => {
    setOpenImage(null);
  };

  /**
   * Handle hash navigation on page load
   */
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        scrollToElement(id);
      }, 100);
    }
  }, [stableContent]);

  /**
   * Reset states when content changes
   */
  useEffect(() => {
    resetFirstH1Flag();
    setRenderError(null);
  }, [content]);

  /**
   * Get markdown components configuration
   */
  const components = useMarkdownComponents({
    onImageClick: handleImageClick,
  });

  /**
   * Render error fallback
   */
  if (renderError) {
    return (
      <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-800 dark:text-amber-200">
        <p className="font-medium mb-1">Markdown rendering error:</p>
        <pre className="text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  /**
   * Preprocess content to fix URL parsing issues
   */
  const processedStableContent = useMemo(() => {
    if (!stableContent.includes('http')) {
      return stableContent;
    }
    return preprocessMarkdownLinks(stableContent);
  }, [stableContent]);

  const processedStreamingContent = useMemo(() => {
    if (!streamingContent.includes('http')) {
      return streamingContent;
    }
    return preprocessMarkdownLinks(streamingContent);
  }, [streamingContent]);

  /**
   * Determine theme class and merge with markdown content styles
   */
  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className}`;
  const streamingClass = 'streaming-content opacity-70 animate-pulse';

  try {
    return (
      <div className={markdownContentClass}>
        {/* Stable content - no re-rendering */}
        {stableContent && (
          <ReactMarkdown
            // @ts-expect-error FIXME: find the root cause of type issue
            remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
            // @ts-expect-error FIXME: find the root cause of type issue
            rehypePlugins={[
              rehypeKatex,
              [rehypeHighlight, { detect: true, ignoreMissing: true }],
            ]}
            components={components}
          >
            {processedStableContent}
          </ReactMarkdown>
        )}
        
        {/* Streaming content - with animation */}
        {streamingContent && (
          <div className={streamingClass}>
            <ReactMarkdown
              // @ts-expect-error FIXME: find the root cause of type issue
              remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
              // @ts-expect-error FIXME: find the root cause of type issue
              rehypePlugins={[
                rehypeKatex,
                [rehypeHighlight, { detect: true, ignoreMissing: true }],
              ]}
              components={components}
            >
              {processedStreamingContent}
            </ReactMarkdown>
          </div>
        )}

        <ImageModal isOpen={!!openImage} imageSrc={openImage} onClose={handleCloseModal} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    setRenderError(error instanceof Error ? error : new Error(String(error)));

    return (
      <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{content}</pre>
    );
  }
};
