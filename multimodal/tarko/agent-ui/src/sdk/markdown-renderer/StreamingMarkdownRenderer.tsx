import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeHighlight from 'rehype-highlight';
import { useMarkdownComponents } from './hooks/useMarkdownComponents';
import { ImageModal } from './components/ImageModal';
import { resetFirstH1Flag } from './components/Headings';
import { preprocessMarkdownLinks, scrollToElement } from './utils';
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

  // Stable parsed markdown + small input buffer
  const [stable, setStable] = useState('');
  const lastContentRef = useRef('');
  const bufferRef = useRef('');
  const flushTimerRef = useRef<number | null>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    'matchMedia' in window &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Close common incomplete markdown constructs so ReactMarkdown can render progressively
  const makeRenderable = (src: string): string => {
    let out = src;
    const fences = (out.match(/```/g) || []).length;
    if (fences % 2 === 1) out += '\n```';
    const dollars = (out.match(/\$\$/g) || []).length;
    if (dollars % 2 === 1) out += '\n$$';
    const ticks = (out.match(/(?<!`)`(?!`)/g) || []).length; // single backticks
    if (ticks % 2 === 1) out += '`';
    return out;
  };

  // Find a safe boundary to flush buffer into stable
  const findSafeIndex = (str: string): number => {
    let idx = -1;
    const para = str.lastIndexOf('\n\n');
    if (para !== -1) idx = Math.max(idx, para + 2);
    const re = /([\.!?。！？，、；;：:])(?:\s|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(str))) idx = Math.max(idx, re.lastIndex);
    const fences = (str.match(/```/g) || []).length;
    if (fences > 0 && fences % 2 === 0) idx = Math.max(idx, str.length);
    return idx;
  };

  const flushBuffer = (aggressive = false) => {
    const buf = bufferRef.current;
    if (!buf) return;
    let cut = findSafeIndex(buf);
    if (aggressive && cut < 0 && buf.length > 180 && /\s$/.test(buf)) cut = buf.length;
    if (cut > 0) {
      const safe = buf.slice(0, cut);
      const rest = buf.slice(cut);
      setStable((prev) => prev + safe);
      bufferRef.current = rest;
    }
  };

  // Stream updates
  useEffect(() => {
    const cur = content;
    const prev = lastContentRef.current;

    // Reset or non-monotonic
    if (!cur.startsWith(prev) || cur.length < prev.length) {
      setStable(cur);
      bufferRef.current = '';
      lastContentRef.current = cur;
      return;
    }

    if (cur.length > prev.length) {
      const delta = cur.slice(prev.length);
      bufferRef.current += delta;
      lastContentRef.current = cur;
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(() => flushBuffer(true), 220);
    }
  }, [content]);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => scrollToElement(id), 100);
    }
  }, [stable]);

  useEffect(() => {
    resetFirstH1Flag();
    setRenderError(null);
    return () => {
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    };
  }, [content]);

  const components = useMarkdownComponents({ onImageClick: (src) => setOpenImage(src) });

  if (renderError) {
    return (
      <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-800 dark:text-amber-200">
        <p className="font-medium mb-1">Markdown rendering error:</p>
        <pre className="text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  const processedStable = useMemo(() => {
    const s = makeRenderable(stable);
    return s.includes('http') ? preprocessMarkdownLinks(s) : s;
  }, [stable]);

  const finalThemeClass = forceDarkTheme ? 'dark' : themeClass;
  const markdownContentClass = `${finalThemeClass} markdown-content font-inter leading-relaxed ${colors.text.primary} ${className}`;

  try {
    return (
      <div className={markdownContentClass} data-reduced-motion={reducedMotion}>
        {processedStable && (
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

        <ImageModal isOpen={!!openImage} imageSrc={openImage} onClose={() => setOpenImage(null)} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    setRenderError(error instanceof Error ? error : new Error(String(error)));
    return <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{content}</pre>;
  }
};
