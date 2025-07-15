import React, { useState, useRef } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { remarkAlert } from 'remark-github-blockquote-alert';
import rehypeHighlight from 'rehype-highlight';
import { Modal, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HeaderAnchor } from './HeaderAnchor';
import { CodeBlock } from './CodeBlock';
import 'highlight.js/styles/github-dark.css';
import 'remark-github-blockquote-alert/alert.css';

interface MarkdownRendererProps {
  content: string;
  publishDate?: string;
  author?: string;
  className?: string;
}

/**
 * MarkdownRenderer component
 * Renders markdown content with custom styling and enhanced functionality
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  publishDate,
  author,
  className = '', // Default to empty string
}) => {
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    firstH1Ref.current = false;
  }, [content]);

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
          className="group text-2xl font-semibold mt-8 mb-3 text-white/90 scroll-mt-20 flex items-center"
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
    p: ({ node, ...props }) => <p className="my-4 text-gray-300 leading-relaxed" {...props} />,
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
            onClick={e => {
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
    ul: ({ node, ...props }) => <ul className="my-4 list-disc pl-6 text-gray-300" {...props} />,
    ol: ({ node, ...props }) => <ol className="my-4 list-decimal pl-6 text-gray-300" {...props} />,
    li: ({ node, ...props }) => <li className="my-1" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote
        className="border-l-4 border-purple-500 pl-4 my-4 italic text-gray-400"
        {...props}
      />
    ),
    code: ({ node, className, children, ...props }) => {
      return (
        <CodeBlock className={className} {...props}>
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
        className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-white/20"
        {...props}
      />
    ),
    td: ({ node, ...props }) => (
      <td className="px-4 py-3 text-gray-400 border-white/10" {...props} />
    ),
    img: ({ node, src, ...props }) => (
      // @ts-expect-error
      <motion.img
        className="max-w-full h-auto my-6 rounded-lg border border-white/10 shadow-lg cursor-pointer"
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

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkAlert]}
        rehypePlugins={[rehypeRaw, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        className={className}
        components={components}
      >
        {content}
      </ReactMarkdown>
      <AnimatePresence>
        {openImage && (
          <Modal
            open={!!openImage}
            onClose={handleCloseModal}
            onClick={handleCloseModal}
            aria-labelledby="image-modal"
          >
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '90%',
                maxHeight: '90vh',
                outline: 'none',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: imageLoaded ? 1 : 0.3,
                  scale: imageLoaded ? 1 : 0.95,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', duration: 0.3 }}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  padding: '8px',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
                }}
              >
                <motion.img
                  src={openImage}
                  alt="Enlarged view"
                  onLoad={() => setImageLoaded(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    objectFit: 'contain',
                    borderRadius: '4px',
                  }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            </Box>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};
