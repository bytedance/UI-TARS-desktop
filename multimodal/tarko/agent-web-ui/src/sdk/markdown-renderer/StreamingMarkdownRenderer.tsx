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
  const { themeClass, colors } = useMarkdownStyles();



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
  }, [content]);

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
  const processedContent = useMemo(() => {
    if (!content.includes('http')) {
      return content;
    }
    return preprocessMarkdownLinks(content);
  }, [content]);

  /**
   * Determine theme class and merge with markdown content styles
   */
  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className}`;

  try {
    return (
      <div className={markdownContentClass}>
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
          {processedContent}
        </ReactMarkdown>

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
