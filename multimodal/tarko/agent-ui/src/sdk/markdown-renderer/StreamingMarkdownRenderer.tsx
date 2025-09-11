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

  // Stable parsed markdown + streaming buffer
  const [stable, setStable] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLSpanElement | null>(null);
  const lastContentRef = useRef('');
  const bufferRef = useRef('');
  const flushTimerRef = useRef<number | null>(null);
  const queueRef = useRef<string[]>([]);
  const rafRef = useRef<number | null>(null);

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

  // Tokenizer for smooth appends
  const tokenize = (text: string): string[] => {
    try {
      // Prefer grapheme segmentation for CJK/emoji
      // @ts-ignore
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        // @ts-ignore
        const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        return Array.from(seg.segment(text), (s: any) => s.segment);
      }
    } catch {}
    // Fallback: words + spaces
    return text.match(/\S+|\s+/g) || [text];
  };

  // Append loop using RAF to avoid jank
  const ensureAppendLoop = () => {
    if (rafRef.current != null) return;
    const step = () => {
      const overlay = overlayRef.current;
      if (!overlay) { rafRef.current = null; return; }
      let budget = 24; // tokens per frame
      while (budget-- > 0 && queueRef.current.length) {
        const tok = queueRef.current.shift() as string;
        const span = document.createElement('span');
        if (!reducedMotion) span.className = 'animate-fade-in';
        span.textContent = tok;
        overlay.appendChild(span);
        bufferRef.current += tok;
      }
      if (queueRef.current.length) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = window.requestAnimationFrame(step);
  };

  // On content stream update
  useEffect(() => {
    const cur = content;
    const prev = lastContentRef.current;

    // Non-monotonic or reset: commit everything to stable to prevent deletions
    if (!cur.startsWith(prev) || cur.length < prev.length) {
      setStable(cur);
      bufferRef.current = '';
      lastContentRef.current = cur;
      const overlay = overlayRef.current; if (overlay) overlay.textContent = '';
      return;
    }

    if (cur.length > prev.length) {
      const delta = cur.slice(prev.length);
      const tokens = tokenize(delta);
      queueRef.current.push(...tokens);
      ensureAppendLoop();
      lastContentRef.current = cur;

      // Debounced flush for safe boundaries
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(() => flushBuffer(true), 300);
    }
  }, [content]);

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

  // After flush, rebuild overlay from residual buffer without animation
  useEffect(() => {
    // This effect runs when stable changes due to flushBuffer
    const overlay = overlayRef.current;
    if (!overlay) return;
    // Keep only residual buffer text
    overlay.textContent = bufferRef.current;
  }, [stable]);

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
        <span ref={overlayRef} className="streaming-container" />

        <ImageModal isOpen={!!openImage} imageSrc={openImage} onClose={handleCloseModal} />
      </div>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    setRenderError(error instanceof Error ? error : new Error(String(error)));
    return <pre className="p-3 text-sm border border-gray-200 rounded-md overflow-auto">{content}</pre>;
  }
};
