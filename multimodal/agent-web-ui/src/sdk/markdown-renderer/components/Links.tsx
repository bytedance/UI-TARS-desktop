import React from 'react';
import { Link } from 'react-router-dom';
import { isExternalUrl, isHashLink, isInternalPath, scrollToElement } from '../utils';

interface LinkProps {
  href?: string;
  children: React.ReactNode;
}

/**
 * Common link styles
 */
const LINK_STYLES =
  'text-accent-500 hover:text-accent-600 transition-colors underline underline-offset-2';

/**
 * Smart link component that handles different URL types
 */
export const SmartLink: React.FC<LinkProps> = ({ href, children, ...props }) => {
  if (!href) {
    return <span {...props}>{children}</span>;
  }

  // Hash links - smooth scrolling to anchors
  if (isHashLink(href)) {
    return (
      <a
        href={href}
        className={LINK_STYLES}
        onClick={(e) => {
          e.preventDefault();
          scrollToElement(href.substring(1));
        }}
        {...props}
      >
        {children}
      </a>
    );
  }

  // Internal path links - use React Router
  if (isInternalPath(href)) {
    return (
      <Link to={href} className={LINK_STYLES} {...props}>
        {children}
      </Link>
    );
  }

  // External links - open in new tab
  return (
    <a href={href} className={LINK_STYLES} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};
