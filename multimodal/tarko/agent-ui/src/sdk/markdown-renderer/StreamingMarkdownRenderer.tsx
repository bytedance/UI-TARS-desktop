import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
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

interface StreamingMarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
  forceDarkTheme?: boolean;
}

export const StreamingMarkdownRenderer: React.FC<StreamingMarkdownRendererProps> = (props) => {
  return (
    <MarkdownThemeProvider>
      <StreamingMarkdownRendererContent {...props} />
    </MarkdownThemeProvider>
  );
};

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevContentRef = useRef<string>('');
  const prevSpanCountRef = useRef<number>(0);

  const reducedMotion =
    typeof window !== 'undefined' &&
    'matchMedia' in window &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stagger new words only; keep existing words static to avoid flicker/deletions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const spans = container.querySelectorAll<HTMLSpanElement>('.animate-fade-in');
    const total = spans.length;
    if (!total) return;

    const prev = prevSpanCountRef.current;
    const incremental = content.startsWith(prevContentRef.current) && content.length > prevContentRef.current.length;

    const startIndex = incremental ? prev : 0;
    const maxTotal = 700;
    const per = Math.max(10, Math.floor(maxTotal / Math.max(1, total - startIndex)));

    spans.forEach((el, idx) => {
      if (idx < startIndex || reducedMotion) {
        el.classList.add('no-animation');
        el.style.animationDelay = '0ms';
      } else {
        el.classList.remove('no-animation');
        el.style.animationDelay = `${Math.min((idx - startIndex) * per, maxTotal)}ms`;
      }
    });

    prevSpanCountRef.current = total;
    prevContentRef.current = content;
  }, [content, reducedMotion]);

  const handleImageClick = (src: string) => setOpenImage(src);
  const handleCloseModal = () => setOpenImage(null);

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

  const components = useMarkdownComponents({ onImageClick: handleImageClick });

  if (renderError) {
    return (
      <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-800 dark:text-amber-200">
        <p className="font-medium mb-1">Markdown rendering error:</p>
        <pre className="text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  const processedContent = useMemo(() => {
    if (!content.includes('http')) return content;
    return preprocessMarkdownLinks(content);
  }, [content]);

  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className}`;

  // Only enable word-splitting during incremental streaming to keep DOM stable
  const rehypePlugins = useMemo(() => {
    const base: any[] = [rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]];
    const incremental = content.startsWith(prevContentRef.current) && content.length > prevContentRef.current.length;
    return incremental ? [...base, rehypeSplitWordsIntoSpans] : base;
  }, [content]);

  try {
    return (
      <div ref={containerRef} className={markdownContentClass} data-reduced-motion={reducedMotion}>
        <ReactMarkdown
          // @ts-expect-error FIXME types
          remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
          // @ts-expect-error FIXME types
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
    return <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{content}</pre>;
  }
};
