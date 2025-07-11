import { useEffect } from 'react';
import { isInSSR } from '../../shared/env';

interface PageMetaOptions {
  title?: string;
  description?: string;
  type?: 'website' | 'article';
  url?: string;
}

/**
 * Hook to set page meta tags for better SEO
 * Safely handles SSR environment to avoid build failures
 */
export function usePageMeta(options: PageMetaOptions) {
  useEffect(() => {
    // Avoid setting meta tags during SSR to prevent build issues
    if (isInSSR() || typeof document === 'undefined') {
      return;
    }

    const { title, description, type = 'website', url } = options;

    // Set document title
    if (title) {
      document.title = title;
    }

    // Helper function to set or update meta tag
    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Set basic meta tags
    if (description) {
      setMetaTag('description', description);
      setMetaTag('og:description', description, true);
      setMetaTag('twitter:description', description);
    }

    if (title) {
      setMetaTag('og:title', title, true);
      setMetaTag('twitter:title', title);
    }

    // Set Open Graph and Twitter meta tags
    setMetaTag('og:type', type, true);
    setMetaTag('twitter:card', 'summary_large_image');

    if (url) {
      setMetaTag('og:url', url, true);
    }

  }, [options.title, options.description, options.type, options.url]);
}

/**
 * Generate page title with site branding
 */
export function generatePageTitle(pageTitle?: string): string {
  const siteTitle = 'Agent TARS';
  return pageTitle ? `${pageTitle} | ${siteTitle}` : siteTitle;
}

/**
 * Truncate description to optimal length for meta tags
 */
export function optimizeDescription(description: string, maxLength: number = 155): string {
  if (description.length <= maxLength) {
    return description;
  }
  
  // Find the last complete word within the limit
  const truncated = description.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  
  return lastSpaceIndex > 0 
    ? truncated.substring(0, lastSpaceIndex) + '...'
    : truncated + '...';
}
