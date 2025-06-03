import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeHighlight from 'rehype-highlight';
import { Dialog } from '@headlessui/react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HeaderAnchor } from './HeaderAnchor';
import { CodeBlock } from './CodeBlock';
import 'highlight.js/styles/github.css';
import 'remark-github-blockquote-alert/alert.css';

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
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  publishDate,
  author,
  className = '',
  forceDarkTheme = false,
}) => {
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);
  // Add a ref to track if we've rendered the first h1
  const firstH1Ref = useRef(false);

  const handleImageClick = (src: string) => {
    setOpenImage(src);
    setImageLoaded(false);
  };

  const handleCloseModal = () => {
    setOpenImage(null);
  };

  // Handle hash navigation on page load
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        // Use setTimeout to ensure page is fully rendered before scrolling
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [content]); // Re-check when content changes

  // Reset the first h1 flag when content changes
  useEffect(() => {
    firstH1Ref.current = false;
    setRenderError(null); // Reset any previous errors when content changes
  }, [content]);

  // If there was a rendering error, show a fallback
  if (renderError) {
    return (
      <div className="p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-800 dark:text-amber-200">
        <p className="font-medium mb-1">Markdown rendering error:</p>
        <pre className="text-xs overflow-auto">{content}</pre>
      </div>
    );
  }

  // Determine the theme class based on the forceDarkTheme prop
  const themeClass = forceDarkTheme ? 'dark' : '';

  const components: Components = {
    h1: ({ node, children, ...props }) => {
      // Generate ID from heading text for anchor links
      const id = children
        ?.toString()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');

      // Check if this is the first h1 and set the flag
      const isFirstH1 = !firstH1Ref.current;
      if (isFirstH1) {
        firstH1Ref.current = true;
      }

      return (
        <>
          <h1
            id={id}
            className="group text-4xl font-bold mb-2 pb-2 border-b border-white/10 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent scroll-mt-20 flex items-center"
            {...props}
          >
            {children}
            {id && <HeaderAnchor id={id} />}
          </h1>

          {/* Display metadata only after the first h1 */}
          {isFirstH1 && (publishDate || author) && (
            <div className="flex items-center gap-1 mb-6 text-sm text-gray-400 mb-10">
              {publishDate && <span>{publishDate}</span>}
              {author && (
                <>
                  {publishDate && <span>•</span>}
                  <span>{author}</span>
                </>
              )}
            </div>
          )}
        </>
      );
    },
    h2: ({ node, children, ...props }) => {
      const id = children
        ?.toString()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
      return (
        <h2
          id={id}
          className="group text-3xl font-bold mt-12 mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent scroll-mt-20 flex items-center"
          {...props}
        >
          {children}
          {id && <HeaderAnchor id={id} />}
        </h2>
      );
    },
    h3: ({ node, children, ...props }) => {
      const id = children
        ?.toString()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
      return (
        <h3
          id={id}
          className="group text-2xl font-semibold mt-8 mb-3 text-gray-800 dark:text-gray-200 scroll-mt-20 flex items-center"
          {...props}
        >
          {children}
          {id && <HeaderAnchor id={id} />}
        </h3>
      );
    },
    h4: ({ node, children, ...props }) => {
      const id = children
        ?.toString()
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '-');
      return (
        <h4
          id={id}
          className="group text-xl font-semibold mt-6 mb-2 text-white/80 scroll-mt-20 flex items-center"
          {...props}
        >
          {children}
          {id && <HeaderAnchor id={id} />}
        </h4>
      );
    },
    p: ({ node, ...props }) => (
      <p className="my-0 text-gray-800 dark:text-gray-200 leading-relaxed" {...props} />
    ),
    a: ({ node, href, ...props }) => {
      // Handle three types of links:
      // 1. Hash links (#section)
      // 2. Internal path links (/path)
      // 3. External links (https://...)

      if (href && href.startsWith('#')) {
        // Hash links - use smooth scrolling
        return (
          <a
            href={href}
            className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
            onClick={(e) => {
              e.preventDefault();
              // Find target element and scroll into view
              const element = document.getElementById(href.substring(1));
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                // Update URL without page reload
                window.history.pushState(null, '', href);
              }
            }}
            {...props}
          />
        );
      } else if (href && !href.match(/^(https?:)?\/\//) && href.startsWith('/')) {
        // Internal links - use React Router's Link
        return (
          <Link
            to={href}
            className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
            {...props}
          />
        );
      }

      // External links - open in new tab
      return (
        <a
          href={href}
          className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      );
    },
    ul: ({ node, ...props }) => (
      <ul className="my-4 list-disc pl-6 text-gray-800 dark:text-gray-200" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="my-4 list-decimal pl-6 text-gray-800 dark:text-gray-200" {...props} />
    ),
    li: ({ node, ...props }) => <li className="my-1" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="border-l-4 border-purple-500 pl-4 my-4 italic text-gray-400"
        {...props}
      />
    ),
    code: ({ node, className, children, ...props }) => {
      return (
        <CodeBlock className={`${className} dark:text-gray-200 dark:bg-gray-800`} {...props}>
          {children}
        </CodeBlock>
      );
    },
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border-collapse border border-white/20 text-sm" {...props} />
      </div>
    ),
    thead: ({ node, ...props }) => <thead className="bg-white/5" {...props} />,
    tbody: ({ node, ...props }) => <tbody className="divide-y divide-white/10" {...props} />,
    tr: ({ node, ...props }) => <tr className="hover:bg-white/5 transition-colors" {...props} />,
    th: ({ node, ...props }) => (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-800 dark:text-gray-200 uppercase tracking-wider border-b border-white/20"
        {...props}
      />
    ),
    td: ({ node, ...props }) => (
      <td className="px-4 py-3 text-gray-800 border-white/10" {...props} />
    ),
    img: ({ node, src, ...props }) => (
      // @ts-expect-error
      <motion.img
        className="max-w-full h-auto my-6 rounded-lg border border-white/10 cursor-pointer"
        src={src}
        onClick={() => src && handleImageClick(src)}
        {...props}
        alt={props.alt || 'Documentation image'}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      />
    ),
    hr: ({ node, ...props }) => <hr className="my-8 border-t border-white/10" {...props} />,
  };

  try {
    return (
      <div className={`${themeClass} markdown-content`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkAlert]}
          rehypePlugins={[rehypeRaw, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
          className={className}
          components={components}
        >
          {content}
        </ReactMarkdown>
        
        {/* 图片预览对话框 */}
        <Dialog open={!!openImage} onClose={handleCloseModal} className="relative z-[9999]">
          {/* 背景遮罩 */}
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
          
          {/* 图片容器 */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="max-w-[90vw] max-h-[90vh] outline-none">
              <motion.img
                src={openImage || ''}
                alt="Enlarged view"
                onLoad={() => setImageLoaded(true)}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: imageLoaded ? 1 : 0.3,
                  scale: imageLoaded ? 1 : 0.95,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', duration: 0.3 }}
                onClick={handleCloseModal}
              />
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    );
  } catch (error) {
    console.error('Error rendering markdown:', error);
    setRenderError(error instanceof Error ? error : new Error(String(error)));

    // Fallback render for raw content
    return (
      <pre className="p-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md overflow-auto">
        {content}
      </pre>
    );
  }
};
