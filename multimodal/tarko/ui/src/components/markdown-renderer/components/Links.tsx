import React from 'react';
import { Link } from 'react-router-dom';
import { isHashLink, isInternalPath, scrollToElement } from '../utils';

interface LinkProps {
  href?: string;
  children: React.ReactNode;
}

export const SmartLink: React.FC<LinkProps> = ({ href, children, ...props }) => {
  const linkStyles =
    'text-accent-500 hover:text-accent-600 transition-colors underline underline-offset-2';

  if (!href) {
    return <span {...props}>{children}</span>;
  }

  if (isHashLink(href)) {
    return (
      <a
        href={href}
        className={linkStyles}
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

  if (isInternalPath(href)) {
    return (
      <Link to={href} className={linkStyles} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={linkStyles} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
};
