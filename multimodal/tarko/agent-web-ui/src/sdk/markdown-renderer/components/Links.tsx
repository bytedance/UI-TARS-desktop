import React from 'react';
import { Link } from 'react-router-dom';
import { isExternalUrl, isHashLink, isInternalPath, scrollToElement } from '../utils';

/**
 * Fix URL text that incorrectly includes Chinese characters
 * This addresses the remark-gfm parsing issue with Chinese text
 */
function fixUrlWithChinese(href: string, children: React.ReactNode): [string, React.ReactNode] {
  // Only process if children is a single text node that matches the href
  if (typeof children === 'string' && children === href) {
    const chineseRegex = /^(https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+)([\u4e00-\u9fff\u3000-\u303f\uff00-\uffef].*)$/;
    const match = children.match(chineseRegex);
    
    if (match) {
      const [, cleanUrl, chineseText] = match;
      return [
        cleanUrl,
        (
          <>
            {cleanUrl}
            <span className="ml-0">{chineseText}</span>
          </>
        )
      ];
    }
  }
  
  return [href, children];
}

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

  // Fix URL parsing issues with Chinese text
  const [fixedHref, fixedChildren] = fixUrlWithChinese(href, children);

  // Hash links - smooth scrolling to anchors
  if (isHashLink(fixedHref)) {
    return (
      <a
        href={fixedHref}
        className={LINK_STYLES}
        onClick={(e) => {
          e.preventDefault();
          scrollToElement(fixedHref.substring(1));
        }}
        {...props}
      >
        {fixedChildren}
      </a>
    );
  }

  // Internal path links - use React Router
  if (isInternalPath(fixedHref)) {
    return (
      <Link to={fixedHref} className={LINK_STYLES} {...props}>
        {fixedChildren}
      </Link>
    );
  }

  // External links - open in new tab
  return (
    <a href={fixedHref} className={LINK_STYLES} target="_blank" rel="noopener noreferrer" {...props}>
      {fixedChildren}
    </a>
  );
};
