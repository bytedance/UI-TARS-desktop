import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
// @ts-ignore - CSS modules type definition will be generated
import styles from './UserMessageRenderer.module.css';

interface UserMessageRendererProps {
  /** The markdown content to render */
  content: string;
  /** Additional class names to apply to the root element */
  className?: string;
  /** Whether to allow HTML in the markdown (default: false) */
  allowHtml?: boolean;
}

const UserMessageRenderer: React.FC<UserMessageRendererProps> = ({
  content,
  className = '',
  allowHtml = false,
}) => {
  const components = useMemo<Components>(
    () => ({
      // Headings
      h1: ({ children }) => (
        <h1 className={styles.heading1} role="heading" aria-level={1}>
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className={styles.heading2} role="heading" aria-level={2}>
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className={styles.heading3} role="heading" aria-level={3}>
          {children}
        </h3>
      ),

      // Code blocks and inline code
      code: ({ node, className: codeClassName, children, ...props }) => {
        const isInline = !node?.position;

        if (isInline) {
          return (
            <code className={styles.inlineCode} {...props}>
              {children}
            </code>
          );
        }
        return (
          <pre className={styles.codeBlock}>
            <code className={codeClassName} {...props}>
              {children}
            </code>
          </pre>
        );
      },

      // Lists
      ul: ({ children }) => (
        <ul className={styles.list} role="list">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className={styles.orderedList} role="list">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className={styles.listItem}>{children}</li>,

      // Text formatting
      p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
      strong: ({ children }) => (
        <strong className={styles.strong}>{children}</strong>
      ),
      em: ({ children }) => <em className={styles.em}>{children}</em>,

      // Blockquote
      blockquote: ({ children }) => (
        <blockquote className={styles.blockquote}>{children}</blockquote>
      ),

      // Horizontal rule
      hr: () => <hr className={styles.hr} aria-hidden="true" />,

      // Strikethrough
      del: ({ children }) => <del className={styles.del}>{children}</del>,

      // Links - open in new tab with security attributes
      a: ({ children, href, ...props }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className={styles.link}
          aria-label={
            typeof children === 'string'
              ? `Open ${children} in new tab`
              : 'Open link in new tab'
          }
          {...props}
        >
          {children}
        </a>
      ),
    }),
    [],
  );

  return (
    <div className={`${styles.userMessage} ${className}`}>
      <ReactMarkdown skipHtml={!allowHtml} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default React.memo(UserMessageRenderer);
