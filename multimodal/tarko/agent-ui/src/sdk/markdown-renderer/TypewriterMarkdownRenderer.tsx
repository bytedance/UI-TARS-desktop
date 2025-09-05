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

interface TypewriterMarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
  typeSpeed?: number; // Characters per second
}

/**
 * TypewriterMarkdownRenderer component
 * Renders markdown content with smooth typewriter animation
 */
export const TypewriterMarkdownRenderer: React.FC<TypewriterMarkdownRendererProps> = (props) => {
  return (
    <MarkdownThemeProvider>
      <TypewriterMarkdownRendererContent {...props} />
    </MarkdownThemeProvider>
  );
};

/**
 * Internal component that uses the theme context
 */
const TypewriterMarkdownRendererContent: React.FC<TypewriterMarkdownRendererProps> = ({
  content,
  publishDate,
  author,
  className = '',
  forceDarkTheme = false,
  typeSpeed = 50, // 50 characters per second
}) => {
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [displayedContent, setDisplayedContent] = useState('');
  const { themeClass, colors } = useMarkdownStyles();
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const targetContentRef = useRef('');

  /**
   * Typewriter animation effect
   */
  useEffect(() => {
    targetContentRef.current = content;
    
    // If content is shorter than displayed (user edited), jump to new content immediately
    if (content.length < displayedContent.length) {
      setDisplayedContent(content);
      return;
    }

    // If content hasn't changed, do nothing
    if (content === displayedContent) {
      return;
    }

    // Start typewriter animation
    const animate = (timestamp: number) => {
      if (lastUpdateRef.current === 0) {
        lastUpdateRef.current = timestamp;
      }

      const elapsed = timestamp - lastUpdateRef.current;
      const charactersToAdd = Math.floor((elapsed / 1000) * typeSpeed);

      if (charactersToAdd > 0) {
        const currentLength = displayedContent.length;
        const targetLength = targetContentRef.current.length;
        const newLength = Math.min(currentLength + charactersToAdd, targetLength);
        
        setDisplayedContent(targetContentRef.current.substring(0, newLength));
        lastUpdateRef.current = timestamp;

        // Continue animation if not complete
        if (newLength < targetLength) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          animationRef.current = null;
          lastUpdateRef.current = 0;
        }
      } else {
        // Continue animation
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Start new animation
    lastUpdateRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [content, typeSpeed]);

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
  }, [displayedContent]);

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
        <pre className="text-xs overflow-auto">{displayedContent}</pre>
      </div>
    );
  }

  /**
   * Preprocess content to fix URL parsing issues
   */
  const processedContent = useMemo(() => {
    if (!displayedContent.includes('http')) {
      return displayedContent;
    }
    return preprocessMarkdownLinks(displayedContent);
  }, [displayedContent]);

  /**
   * Determine theme class and merge with markdown content styles
   */
  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className}`;

  // Check if currently typing
  const isTyping = displayedContent.length < content.length;

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
        
        {/* Blinking cursor when typing */}
        {isTyping && (
          <span className="typewriter-cursor inline-block w-0.5 h-5 bg-current ml-1"></span>
        )}

        <ImageModal isOpen={!!openImage} imageSrc={openImage} onClose={handleCloseModal} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    setRenderError(error instanceof Error ? error : new Error(String(error)));

    return (
      <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{displayedContent}</pre>
    );
  }
};
