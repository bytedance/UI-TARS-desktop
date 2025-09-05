import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeHighlight from 'rehype-highlight';
import { rehypeSplitWordsIntoSpans } from './plugins/rehype-animate-text';
import { useMarkdownComponents } from './hooks/useMarkdownComponents';
import { ImageModal } from './components/ImageModal';
import { resetFirstH1Flag } from './components/Headings';
import { scrollToElement, preprocessMarkdownLinks } from './utils';
import { MarkdownThemeProvider, useMarkdownStyles } from './context/MarkdownThemeContext';
import 'katex/dist/katex.min.css';
import 'remark-github-blockquote-alert/alert.css';
import './syntax-highlight.css';
import './markdown.css';
import './animate-text.css';

interface MarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
}

/**
 * MarkdownRenderer component
 * Renders markdown content with custom styling and enhanced functionality
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = (props) => {
  return (
    <MarkdownThemeProvider>
      <MarkdownRendererContent {...props} />
    </MarkdownThemeProvider>
  );
};

/**
 * Internal component that uses the theme context
 * Separated to ensure theme provider is available
 */
const MarkdownRendererContent: React.FC<MarkdownRendererProps> = ({
  content,
  publishDate,
  author,
  className = '',
  forceDarkTheme = false,
}) => {
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { themeClass, colors } = useMarkdownStyles();
  const markdownRef = useRef<HTMLDivElement>(null);
  const prevContentRef = useRef<string>('');
  const isInitialMount = useRef(true);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
   * Improved animation detection with debouncing
   */
  useEffect(() => {
    const currentLength = content.trim().length;
    const previousLength = prevContentRef.current.trim().length;
    const isIncremental = currentLength > previousLength && previousLength > 0;
    const hasContentChanged = prevContentRef.current.trim() !== content.trim();

    // Skip animation on initial mount with existing content
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (content.trim()) {
        prevContentRef.current = content;
        setShouldAnimate(false);
        return;
      }
    }

    // Clear existing animation timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Enable animation for incremental changes with debouncing
    if (hasContentChanged && isIncremental) {
      setShouldAnimate(true);

      // Auto-disable animation after a reasonable duration
      animationTimeoutRef.current = setTimeout(() => {
        setShouldAnimate(false);
      }, 1000); // Increased timeout for smoother experience

      prevContentRef.current = content;
    } else {
      // No animation needed
      prevContentRef.current = content;
      setShouldAnimate(false);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [content]);

  /**
   * Optimized animation delay application
   */
  useEffect(() => {
    if (shouldAnimate && markdownRef.current) {
      const container = markdownRef.current;
      const animatedSpans = container.querySelectorAll('.animate-fade-in');
      const spanCount = animatedSpans.length;

      if (spanCount === 0) return;

      // Improved delay calculation to prevent overwhelming animations
      const baseDelay = 30; // Minimum delay between animations
      const maxTotalDelay = 800; // Maximum total animation duration
      const delayPerSpan = Math.min(baseDelay, maxTotalDelay / spanCount);

      animatedSpans.forEach((span, index) => {
        const element = span as HTMLElement;

        // Reset animation state
        element.classList.remove('no-animation');
        element.style.opacity = '0';

        // Apply staggered delay with better distribution
        const delay = Math.min(index * delayPerSpan, maxTotalDelay);
        element.style.animationDelay = `${delay}ms`;

        // Force reflow to ensure animation starts properly
        element.offsetHeight;
      });
    }
  }, [shouldAnimate, content]);

  /**
   * Handle hash navigation on page load
   */
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      // Use setTimeout to ensure page is fully rendered before scrolling
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
   * Preprocess content to fix URL parsing issues with Chinese text
   * Memoized to avoid unnecessary regex operations on every render
   */
  const processedContent = useMemo(() => {
    // Quick check: only process if content contains URLs that might need fixing
    if (!content.includes('http')) {
      return content;
    }
    return preprocessMarkdownLinks(content);
  }, [content]);

  /**
   * Determine rehype plugins based on animation state
   */
  const rehypePlugins = useMemo(() => {
    const basePlugins = [
      rehypeRaw,
      rehypeKatex,
      [rehypeHighlight, { detect: true, ignoreMissing: true }],
    ];

    if (shouldAnimate) {
      return [...basePlugins, rehypeSplitWordsIntoSpans];
    }

    return basePlugins;
  }, [shouldAnimate]);

  /**
   * Determine theme class and merge with markdown content styles
   */
  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className} ${!shouldAnimate ? 'no-animation' : ''}`;

  try {
    return (
      <div ref={markdownRef} className={markdownContentClass}>
        <ReactMarkdown
          // @ts-expect-error FIXME: find the root cause of type issue
          remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
          // @ts-expect-error FIXME: find the root cause of type issue
          rehypePlugins={rehypePlugins}
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

    // Fallback render for raw content
    return (
      <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{content}</pre>
    );
  }
};
