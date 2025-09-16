import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeHighlight from 'rehype-highlight';
import { useMarkdownComponents } from './components';
import { ImageModal } from './components/ImageModal';
import { resetFirstH1Flag } from './components/Headings';
import { scrollToElement, preprocessMarkdownLinks } from './utils';
import { useDarkMode } from '../../hooks';
import 'katex/dist/katex.min.css';
import 'remark-github-blockquote-alert/alert.css';
import './styles/syntax-highlight.css';
import './styles/markdown.css';

interface MarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
  codeBlockStyle?: React.CSSProperties;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  publishDate,
  author,
  className = '',
  forceDarkTheme = false,
  codeBlockStyle,
}) => {
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const isDarkMode = useDarkMode();
  const themeClass = forceDarkTheme ? 'dark' : (isDarkMode ? 'dark' : 'light');

  const handleImageClick = (src: string) => {
    setOpenImage(src);
  };

  const handleCloseModal = () => {
    setOpenImage(null);
  };

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);

      setTimeout(() => {
        scrollToElement(id);
      }, 100);
    }
  }, [content]);

  useEffect(() => {
    resetFirstH1Flag();
    setRenderError(null);
  }, [content]);

  const components = useMarkdownComponents({
    onImageClick: handleImageClick,
    codeBlockStyle,
  });

  if (renderError) {
    return (
      <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-800 dark:text-amber-200">
        <p className="font-medium mb-1">Markdown rendering error:</p>
        <pre className="text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  const processedContent = useMemo(() => {
    if (!content.includes('http')) {
      return content;
    }
    return preprocessMarkdownLinks(content);
  }, [content]);

  const markdownContentClass = `${themeClass} markdown-content font-inter leading-relaxed ${className}`;

  try {
    return (
      <div className={markdownContentClass}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
          rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
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
