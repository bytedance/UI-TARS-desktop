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

  // Stable parsed markdown and streaming buffer chunks
  const [stable, setStable] = useState('');
  const [chunks, setChunks] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastContentRef = useRef('');
  const bufferRef = useRef('');
  const flushTimerRef = useRef<number | null>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    'matchMedia' in window &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Compute safe flush index for current buffer
  const findSafeIndex = (str: string): number => {
    let idx = -1;
    // Paragraph boundary
    const para = str.lastIndexOf('\n\n');
    if (para !== -1) idx = Math.max(idx, para + 2);

    // Punctuation + space/newline boundary (includes CJK)
    const re = /([\.!?。！？，、；;：:])(?:\s|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str))) {
      idx = Math.max(idx, re.lastIndex);
    }

    // Fenced code block closed
    const fences = (str.match(/```/g) || []).length;
    if (fences > 0 && fences % 2 === 0) idx = Math.max(idx, str.length);

    return idx;
  };

  // Flush buffer (move safe part to stable)
  const flushBuffer = (aggressive = false) => {
    const buf = bufferRef.current;
    if (!buf) return;

    let cut = findSafeIndex(buf);

    // Aggressive fallback: large buffer with whitespace ending
    if (aggressive && cut < 0) {
      if (buf.length > 160 && /\s$/.test(buf)) cut = buf.length;
    }

    if (cut > 0) {
      const safe = buf.slice(0, cut);
      const rest = buf.slice(cut);
      setStable((prev) => prev + safe);
      bufferRef.current = rest;
      setChunks(rest ? [rest] : []);
    }
  };

  // On content stream update
  useEffect(() => {
    const cur = content;
    const prev = lastContentRef.current;

    // Non-monotonic or reset: commit everything to stable to prevent deletions
    if (!cur.startsWith(prev) || cur.length < prev.length) {
      setStable(cur);
      bufferRef.current = '';
      setChunks([]);
      lastContentRef.current = cur;
      return;
    }

    if (cur.length > prev.length) {
      const delta = cur.slice(prev.length);
      bufferRef.current += delta;
      setChunks((old) => (old.length ? [...old, delta] : [delta]));
      lastContentRef.current = cur;

      // Debounced flush for safe boundaries
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(() => flushBuffer(true), 700);
    }
  }, [content]);

  // Animate only the newest chunk
  const renderStreamingChunks = () => {
    if (!chunks.length) return null;
    return (
      <span className="whitespace-pre-wrap">
        {chunks.map((c, i) => (
          <span
            key={`${stable.length}-${i}`}
            className={`$${i === chunks.length - 1 && !reducedMotion ? 'animate-fade-in' : 'no-animation'}`}
          >
            {c}
          </span>
        ))}
      </span>
    );
  };

  const handleImageClick = (src: string) => setOpenImage(src);
  const handleCloseModal = () => setOpenImage(null);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        scrollToElement(id);
      }, 100);
    }
  }, [stable]);

  useEffect(() => {
    resetFirstH1Flag();
    setRenderError(null);
    return () => {
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    };
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

  const processedStable = useMemo(() => {
    if (!stable.includes('http')) return stable;
    return preprocessMarkdownLinks(stable);
  }, [stable]);

  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className}`;

  try {
    return (
      <div ref={containerRef} className={markdownContentClass} data-reduced-motion={reducedMotion}>
        {/* Stable parsed markdown */}
        {stable && (
          <ReactMarkdown
            // @ts-expect-error FIXME types
            remarkPlugins={[remarkGfm, remarkMath, remarkAlert]}
            // @ts-expect-error FIXME types
            rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
            components={components}
          >
            {processedStable}
          </ReactMarkdown>
        )}

        {/* Streaming overlay (plain text, minimal DOM churn) */}
        {renderStreamingChunks()}

        <ImageModal isOpen={!!openImage} imageSrc={openImage} onClose={handleCloseModal} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    setRenderError(error instanceof Error ? error : new Error(String(error)));
    return <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{content}</pre>;
  }
};
